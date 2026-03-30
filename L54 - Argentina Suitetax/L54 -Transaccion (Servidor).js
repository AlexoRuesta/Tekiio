/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 *
 */
 define(
  [
    "N/record", "L54/utilidades", "N/runtime", "N/format", "N/url", "N/https", "N/search", "L54/ValidarPercepciones", "L54/LIBGenerarConceptoTransaccion", "N/plugin"
  ],
  function (record, utilidades, runtime, format, url, https, search, validPer, LIBGenerarConceptoTransaccion, plugin) {

    function toBool(v) {
      if (v === "T") return true;
      if (v === "F") return false;
      return v;
    }
    /*global define log */
    // migrado desde L54 -Transacción (Servidor) (l54_SS_v2012.js)
    // tambien absorve el script L54 - Generar Boton Calcular PV ( su funcion antes de cargar)
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

      const proceso = "beforeLoad";

      try {
        if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == scriptContext.UserEventType.COPY) {
          log.debug(proceso, "INICIO - beforeLoad - scriptContext.type: " + scriptContext.type);

          const formTransaction = scriptContext.form;
          const objRecord = scriptContext.newRecord;

          formTransaction.clientScriptModulePath = "./L54 - Calcular Percepciones (cliente).js";

          formTransaction.addButton({
            id: "custpage_calular_percepciones",
            label: "Calcular Percepciones",
            functionName: "calcularPercepcionesVentas"
          });

          // INICIO - CAMBIOS POR ERROR EN FACTURACION MASIVA CON PERCEPCIONES DESDE OV EL 14/08/2025 (LINEA CERRADA)
            const createdfrom = objRecord.getValue('createdfrom');

            if (objRecord.type == 'invoice' && !isEmpty(createdfrom) && scriptContext.type == scriptContext.UserEventType.CREATE) {
              const taxDetailsLineCount = objRecord.getLineCount({ sublistId: 'taxdetails' });

              for (let i = taxDetailsLineCount - 1; i >= 0; i--) {
                let reference = objRecord.getSublistValue({
                  sublistId: 'taxdetails',
                  fieldId: 'taxdetailsreference',
                  line: i
                });

                if (!isEmpty(reference)) {
                  let itemLine = objRecord.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'taxdetailsreference',
                    value: reference
                  });

                  if (isEmpty(itemLine) || itemLine == -1) {
                    objRecord.removeLine({
                      sublistId: 'taxdetails',
                      line: i,
                      ignoreRecalc: true
                    });
                  }
                }
              }
            }
            // FIN
          /* formTransaction.addButton({
                        id: 'custpage_cancelar_percepciones',
                        label: 'Cancelar Percepciones',
                        functionName: "cancelarPercepciones"
                    }); */

          log.debug(proceso, "FIN - beforeLoad - scriptContext.type: " + scriptContext.type);
        }
      } catch (error) {
        log.error(proceso, "LINE 51 - Error NetSuite Excepción - detalles: " + error.message);
      }
    }

    /**
        * Function definition to be triggered before record is submit.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type
        * @Since 2015.2
        */
    function beforeSubmit(scriptContext) {

      const proceso = "beforeSubmit";
      try {

        let objRecord = scriptContext.newRecord;
        const recType = objRecord.type;
        const currentScript = runtime.getCurrentScript();

        if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {

          log.debug(proceso, "LINE 46 - INICIO beforeSubmit - scriptContext.type: " + scriptContext.type);
          log.audit("Governance Monitoring", "LINE 76 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());

          // INICIO CALCULAR DESCUENTO GENERAL
          // FIN CALCULAR DESCUENTO GENERAL

          const subsidiaria = utilidades.l54esOneworld() ? objRecord.getValue("subsidiary") : null;
          const total = objRecord.getValue("total");
          const numeroEnLetras = utilidades.getNumeroEnLetras(String(total), subsidiaria);
          if (!isEmpty(numeroEnLetras)) {
            objRecord.setValue("custbody_l54_monto_escrito", numeroEnLetras);
          }

          const numeradorManual = convertToBoolean(objRecord.getValue("custbody_l54_numerador_manual"));
          const idTransaccionAFIP = objRecord.getValue("custbody_l54_cod_trans_afip");
          const refNumerador = objRecord.getValue("custbody_l54_ref_numerador");
          log.debug(proceso, "LINE 94 - numeradorManual: " + numeradorManual + " - idTransaccionAFIP: " + idTransaccionAFIP + " - refNumerador: " + refNumerador);

          const esND = objRecord.getValue("custbody_l54_nd");
          const tipoTransStr = recType;
          //*LOGICA SETEO AUTOMATICO BOCA Y LETRA
          const bocaAux = objRecord.getValue("custbody_l54_boca");
          const letraAux = objRecord.getValue("custbody_l54_letra");
          log.debug(proceso, "LINE TEST - bocaAux: " + bocaAux + " - letraAux " + letraAux);
          if (utilidades.isEmpty(bocaAux) || utilidades.isEmpty(letraAux)){
            const locationId = objRecord.getValue("location");
            const entity = objRecord.getValue("entity");
            const bocaObtenida = utilidades.obtenerPuntoVenta(esND, subsidiaria, tipoTransStr, locationId);
            log.debug(proceso,"LINE TEST - bocaObtenida: " + bocaObtenida)
            objRecord.setValue("custbody_l54_boca", bocaObtenida);
            if (!utilidades.isEmpty(entity)) {
                const tipoContrCliente = objRecord.getValue("custbody_l54_tipo_contribuyente");
                if (!utilidades.isEmpty(tipoContrCliente)) {
                    const fieldLookUpLetra = search.lookupFields({
                        type: "customrecord_l54_tipo_contribuyente",
                        id: tipoContrCliente,
                        columns: ["custrecord_l54_tipo_cont_letra"]
                    });
                    const letraObtenida = utilidades.getLookupFieldsSafe(fieldLookUpLetra, "custrecord_l54_tipo_cont_letra");
                    log.debug(proceso,"LINE TEST - letraObtenida: " + letraObtenida)
                    if (!utilidades.isEmpty(letraObtenida)) {
                        objRecord.setValue("custbody_l54_letra", letraObtenida);
                    }
                }
            }
          }
          //*
          const bocaId = objRecord.getValue("custbody_l54_boca");
          const letraId = objRecord.getValue("custbody_l54_letra");
          const esLiquidoProducto = isEmpty(objRecord.getValue("custbody_l54_liquido_producto")) ? "F" : objRecord.getValue("custbody_l54_liquido_producto");
          const esCreditoElectronico = isEmpty(objRecord.getValue("custbody_l54_es_credito_electronico")) ? "F" : objRecord.getValue("custbody_l54_es_credito_electronico");
          const tipoTransId = utilidades.numeradorAUtilizarSS(utilidades.getTipoTransId(tipoTransStr), esND, subsidiaria);
          let numeradorArray = "";
          let esConsultaNumerador = false;
          let esNuevoNumero = false;

          log.debug(proceso, "LINE 137 - valores de tipoTransId: " + tipoTransId + " - esND: " + esND + " - tipoTransStr: " + tipoTransStr + " - bocaId: " + bocaId + " - letraId: " + letraId + " - esLiquidoProducto: " + esLiquidoProducto + " - esCreditoElectronico: " + esCreditoElectronico);
          log.audit("Governance Monitoring", "LINE 134 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());

          if (scriptContext.type == scriptContext.UserEventType.CREATE) {

            // INICIO - Manejo de numeradores

            if (numeradorManual == false) {
              log.debug(proceso, "LINE 96 - Valores de LiquidoProducto: " + esLiquidoProducto + " - CreditoElectronico: " + esCreditoElectronico);
              esConsultaNumerador = false;
              numeradorArray = utilidades.devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador);

              if (!isEmpty(numeradorArray) && !isEmpty(numeradorArray["referencia"])) {
                log.debug(proceso, "LINE 101 - numerador: " + numeradorArray["numerador"] + " - numerador prefijo: " + numeradorArray["numeradorPrefijo"] + " - numeradorElectronico: " + numeradorArray["numeradorElectronico"]);
                esNuevoNumero = true;
                objRecord = setearCamposNumeradores(numeradorArray, objRecord, esNuevoNumero);
              } else {
                log.error(proceso, "LINE 124 - No se ha encontrado resultado de numerador con los datos ingresados en la transacción.");
              }
            } else {
              esConsultaNumerador = true;
              // Se consulta el numerador con los datos ingresados (no se retorna un nuevo correlativo de numerador)
              numeradorArray = utilidades.devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador);
            }

            if (!isEmpty(numeradorArray) && !isEmpty(numeradorArray["referencia"])) {
              objRecord.setValue("custbody_l54_ref_numerador", numeradorArray["referencia"]);
            } else {
              log.error(proceso, "LINE 145 - No se ha encontrado resultado para setear la referencia del numerador de la transacción.");
            }

            // FIN - Manejo de numeradores

          } else {

            esConsultaNumerador = true;
            // Se consulta el numerador con los datos ingresados (no se retorna un nuevo correlativo de numerador)
            numeradorArray = utilidades.devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador);

            // INICIO - Manejo de numeradores

            if (!isEmpty(numeradorArray) && !isEmpty(numeradorArray["referencia"])) {
              if (isEmpty(refNumerador) || (refNumerador != numeradorArray["referencia"])) {
                if (numeradorManual == false) {
                  esConsultaNumerador = false;
                  // Se retorna el nuevo numerador con los datos ingresados en la transacción
                  const numeradorArrayNuevo = utilidades.devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador);

                  if (!isEmpty(numeradorArrayNuevo) && !isEmpty(numeradorArrayNuevo["referencia"])) {
                    log.debug(proceso, "LINE 147 - numerador: " + numeradorArrayNuevo["numerador"] + " - numerador prefijo: " + numeradorArrayNuevo["numeradorPrefijo"] + " - numeradorElectronico: " + numeradorArrayNuevo["numeradorElectronico"]);
                    esNuevoNumero = true;
                    objRecord = setearCamposNumeradores(numeradorArrayNuevo, objRecord, esNuevoNumero);
                  } else {
                    log.error(proceso, "LINE 160 - No se ha encontrado resultado para setear la referencia del numerador de la transacción.");
                  }
                } else {
                  esNuevoNumero = false;
                  objRecord = setearCamposNumeradores(numeradorArray, objRecord, esNuevoNumero);
                }
              } else {
                if (isEmpty(idTransaccionAFIP)) {
                  esNuevoNumero = false;
                  objRecord = setearCamposNumeradores(numeradorArray, objRecord, esNuevoNumero);
                }
              }

              const numero_invoice = objRecord.getValue("custbody_l54_numero");
              const nro_localizado = objRecord.getValue("custbody_l54_numero_localizado");

              if (((isEmpty(numero_invoice)) || (isEmpty(nro_localizado))) && (numeradorManual == false)) {

                esConsultaNumerador = false;
                // Se retorna el nuevo numerador con los datos ingresados en la transacción
                const numeradorArrayNuevo = utilidades.devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador);

                if (!isEmpty(numeradorArrayNuevo) && !isEmpty(numeradorArrayNuevo["referencia"])) {
                  log.debug(proceso, "LINE 182 - Setear campos vacío de numeradores - numeradorArrayNuevo['numerador']: " + numeradorArrayNuevo["numerador"] + " - numeradorArrayNuevo['numeradorPrefijo']: " + numeradorArrayNuevo["numeradorPrefijo"] + " - numeradorArrayNuevo['numeradorElectronico']: " + numeradorArrayNuevo["numeradorElectronico"]);
                  esNuevoNumero = true;
                  objRecord = setearCamposNumeradores(numeradorArrayNuevo, objRecord, esNuevoNumero);
                } else {
                  log.error(proceso, "LINE 187 - No se ha encontrado resultado para setear la referencia del numerador de la transacción.");
                }
              }
            } else {
              log.error(proceso, "LINE 191 - Error: no se encuentra el numerador de referencia para los datos que ya están ingresados en la cuenta en relación a letra, punto de venta, entre otros.");
            }

            // FIN - Manejo de numeradores
          }

          // Nuevo Configurar el Codigo de Moneda AFIP
          const monedaId = objRecord.getValue("currency");
          if (!isEmpty(monedaId)) {
            const datosMonedaAFIP = utilidades.obtenerIDMoneda(monedaId);
            if (!isEmpty(datosMonedaAFIP) && !isEmpty(datosMonedaAFIP.idMonedaAFIP)) {
              objRecord.setValue("custbody_l54_tipo_moneda", datosMonedaAFIP.idMonedaAFIP);
            } else {
              log.error(proceso, "LINE 204 - No se puede setear el campo de código de tipo moneda porque no se encontró resultados para la moneda ingresada en la transacción.Z");
            }
          }  

          objRecord.setValue("custbody_l54_reg_inf_trans_act", true);
          log.debug(proceso, "LINE 195 - INICIO verificarTipoItem - recType: " + recType);

          // Esto se debe filtrar para que se ejecute únicamente en contexto dif a UI para no repetir la funcionalidad de UI 
          // Se debe ejecutar cuando viene vacío y se ejecutó por UI
          LIBGenerarConceptoTransaccion.saveRecord(objRecord,'UserEvent', true);
          
        }
      } catch (error) {
        log.error(proceso, "LINE 41 - Error NetSuite Excepción - Detalles: " + error.message);
        log.error(proceso, JSON.stringify(error));
      }
    }

    /**
        * Function definition to be triggered after record is submit.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type
        * @Since 2015.2
        */
    function afterSubmit(scriptContext) {

      const proceso = "afterSubmit";

      try {
        if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {

          log.debug(proceso, "INICIO - afterSubmit - scriptContext.type: " + scriptContext.type);

          const recId = scriptContext.newRecord.id;
          const recType = scriptContext.newRecord.type;
          const currentScript = runtime.getCurrentScript();
          let objRecord = record.load({
            type: recType,
            id: recId
          });

          const subsidiaria = utilidades.l54esOneworld() ? objRecord.getValue("subsidiary") : null;

          const calcularPercepciones = Utils.convertToBoolean(
              objRecord.getValue("custbody_l54_calc_perc_aut")
            );
          log.debug(proceso, "LINE 60 - INICIO Calculo Percepciones en Ventas e Impuestos Internos - Calcular Percepciones : " + calcularPercepciones);
          try {
            objRecord = calcularPercepcionesVentas(calcularPercepciones, currentScript, objRecord);
          } catch (err) {
            log.error(proceso, "LINE 64 - Error Calculo Percepciones en Ventas e Impuestos Internos (Create) - NetSuite error: " + err.message);
          }

          actualizarLineasPorIvaAfterSubmit(objRecord, subsidiaria);

          // Se desmarca el check de la factura aplicada si es el caso
          const idTransApply = [];
          if (recType == "creditmemo") {
            const cantidadItems = objRecord.getLineCount({ sublistId: "apply" });
            for (let j = 0; j < cantidadItems; j++) {
              const aplicado = objRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
              if (aplicado == "T" || aplicado == true) {
                const internalIdLine = objRecord.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
                idTransApply.push({
                  internalId: internalIdLine,
                  line: j
                });
                objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: false });
              }
            }

            log.debug(proceso, "LINE 174 - idTransApply: " + JSON.stringify(idTransApply));
            if (!isEmpty(idTransApply) && idTransApply.length > 0) {
              for (let j = 0; j < idTransApply.length; j++) {
                log.debug(proceso, "LINE 177 - INVOICE DATA APPLIED (T): " + idTransApply[j].internalId);
                objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: idTransApply[j].line, value: true });
              }
            }
          }

          objRecord.save();

          try {
            let recNew = record.load({
              type: objRecord.type,
              id: objRecord.id
            });
            let totalNew = recNew.getValue({ fieldId: "total" });
            const numeroEnLetras = utilidades.getNumeroEnLetras(String(totalNew), subsidiaria);
            const numeroEnLetrasPrev = recNew.getValue({ fieldId: "custbody_l54_monto_escrito" });
            log.debug(proceso, "LINE 327 - MontoTotal: " + totalNew + "  Monto en letras: " + numeroEnLetras);
            
            if (!isEmpty(numeroEnLetras) && numeroEnLetrasPrev != numeroEnLetras ) {
              recNew.setValue("custbody_l54_monto_escrito", numeroEnLetras);
              recNew.save();
            }
            
          } catch (e) {
            log.error(proceso, "Error al actualizar en afterSubmit, error: " + e.message);
          }

          log.debug(proceso, "FIN - afterSubmit - scriptContext.type: " + scriptContext.type);
        }
      } catch (error) {
        log.error(proceso, "LINE 302 - Error NetSuite Excepción - Detalles: " + error.message);
      }
    }



    function setearCamposNumeradores(numeradorArray, objRecord, esNuevoNumero) {

      objRecord.setValue("custbody_l54_ref_numerador", numeradorArray["referencia"]);

      if (!isEmpty(numeradorArray["idTransaccionAFIP"])) {
        objRecord.setValue("custbody_l54_cod_trans_afip", numeradorArray["idTransaccionAFIP"]);
      }
      if (!isEmpty(numeradorArray["numeradorElectronico"])) {
        objRecord.setValue("custbody_l54_numerador_electronico", toBool(numeradorArray["numeradorElectronico"]));
      }

      if (esNuevoNumero) {
        objRecord.setValue("custbody_l54_numero", numeradorArray["numerador"]);
        objRecord.setValue("custbody_l54_numero_localizado", numeradorArray["numeradorPrefijo"]);
      }

      return objRecord;
    }

    function actualizarLineasPorIvaAfterSubmit(objRecord) {
      // actualizar lineas, tanto items como expenses
      // si la linea de la transacción tiene IVA, hay que copiar el campo IMPORTE NETO a NETO GRAVADO
      // si la linea no tiene IVA, hay que copiar IMPORTE NETO a NETO NO GRAVADO

      const proceso = "actualizarLineasPorIvaAfterSubmit";

      try {
        
        const countItems = objRecord.getLineCount({ sublistId: "item" });
        const countExpenses = objRecord.getLineCount({ sublistId: "expense" });
        const tc = objRecord.getValue("exchangerate");
        const arrayAlicuotas = [];

        resultadosImpuestos = getResultsSalesTaxItem();
        let arrayTaxCodes = [];

        if (!isEmpty(resultadosImpuestos) && !resultadosImpuestos.error && resultadosImpuestos.infoResultados.length > 0) {
          // Asigno los resultados de la búsqueda de códigos de impuestos
          arrayTaxCodes = resultadosImpuestos.infoResultados;
        } else {
          log.debug(proceso, "LINE 378 - resultadosImpuestos.error: " + resultadosImpuestos.error + " - resultadosImpuestos.mensaje: " + resultadosImpuestos.mensaje);
        }
        // objRecord.setSublistValue({sublistId: 'recmachcustrecord_l54_ret_ref_pago_prov',fieldId: 'custrecord_l54_ret_fecha_exencion', line: lineNum,  value: fechaExencionString});
        // objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j });                
        for (let repItem = 0; repItem < countItems; repItem++) {

          const importe_neto = objRecord.getSublistValue("item", "amount", repItem);
          const importe_iva = objRecord.getSublistValue("item", "taxamount", repItem);
          const transCodImpuesto = objRecord.getSublistValue("item", "custcol_l54_codigo_impuesto", repItem);
          const taxRate = objRecord.getSublistValue("item", "custcol_l54_tasa_impuesto", repItem);
          const tipoItem = objRecord.getSublistValue("item", "itemtype", repItem);
          const impuestoInterno = objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", repItem);

          log.debug(proceso, "Valor (taxRate) : " + taxRate + " - importe_neto: " + importe_neto + " - importe_iva: " + importe_iva + " - transCodImpuesto: " + transCodImpuesto + " - tipoItem: " + tipoItem + " - impuestoInterno: " + impuestoInterno);

          // Filtro por el código de impuesto de la línea
          const infoTaxCode = (!isEmpty(transCodImpuesto) && !isEmpty(arrayTaxCodes) && arrayTaxCodes.length > 0) ? arrayTaxCodes.filter((obj) => { return obj.idInterno == transCodImpuesto; }) : [];

          log.debug(proceso, "infoTaxCode: " + JSON.stringify(infoTaxCode));

          if (tipoItem != "Subtotal" && tipoItem != "Description") {

            let esPercepcion = "F";
            let esOtroTributo = "F";
            const porcentajeImpuestoParcial = String(objRecord.getSublistValue("item", "custcol_l54_tasa_impuesto", repItem));
            let porcentajeImpuesto = porcentajeImpuestoParcial;

            if (String(porcentajeImpuestoParcial).indexOf("%") != -1) {
              porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
            }
            porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

            let codigoImpuestoAFIP = "";
            let excluirImpuestoAFIP = "F";
            if (!isEmpty(infoTaxCode) && infoTaxCode.length > 0) {
              excluirImpuestoAFIP = infoTaxCode[0].excluirProcesoTXTCV;
              esPercepcion = infoTaxCode[0].esPercepcion;
              esOtroTributo = infoTaxCode[0].esOtroTributo;

              if (isEmpty(excluirImpuestoAFIP))
                excluirImpuestoAFIP = "F";
              if (excluirImpuestoAFIP != "T" && excluirImpuestoAFIP != true)
                codigoImpuestoAFIP = infoTaxCode[0].idImpuestoAFIP;
              if (isEmpty(esOtroTributo))
                esOtroTributo = "F";

              const columnaAcumulacion = infoTaxCode[0].colAcumulacion;
              if (!isEmpty(columnaAcumulacion)) {
                objRecord.setSublistValue("item", "custcol_l54_col_acumulacion_vtas", repItem, columnaAcumulacion);
              }
              const tipoPercepcion = infoTaxCode[0].tipoPercepcion;
              log.debug(proceso, "tipoPercepcion(custcol_l54_tipo_percepcion_vtas)=" + tipoPercepcion);
              if (!isEmpty(tipoPercepcion)) {
                objRecord.setSublistValue("item", "custcol_l54_tipo_percepcion_vtas", repItem, tipoPercepcion);
              }
            }
            if (!isEmpty(codigoImpuestoAFIP) && importe_iva != 0) {
              objRecord.setSublistValue("item", "custcol_l54_id_tipo_impuesto", repItem, codigoImpuestoAFIP);
                if (!arrayAlicuotas.includes(codigoImpuestoAFIP)) {
                arrayAlicuotas.push(codigoImpuestoAFIP);
              }
            }

            let importeNetoNoGravado = 0.00;
            let importeNetoGravado = 0.00;
            let importeExento = 0.00;
            if (tipoItem == "Discount") {
              const importe = parseFloat((importe_neto * tc), 10);
              setearImporteDondeHayaValorEnLaColumnaAnterior(objRecord, "item", repItem, importe);
            } else if (importe_iva != 0 && !isEmpty(importe_iva) && importe_iva != "" && (esPercepcion == "F" || esPercepcion == false)) {
              importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

              objRecord.setSublistValue("item", "custcol_l54_importe_neto_no_gravado", repItem, importeNetoNoGravado);
              objRecord.setSublistValue("item", "custcol_l54_importe_neto_gravado", repItem, importeNetoGravado);
              objRecord.setSublistValue("item", "custcol_l54_importe_exento", repItem, importeExento);
            } else {
              if (esPercepcion == "T" || esPercepcion == true) {
                importeNetoNoGravado = parseFloat(0.00, 10);
              } else {
                if (!isEmpty(infoTaxCode) && infoTaxCode.length > 0 && (infoTaxCode[0].ivaExento != "T" && infoTaxCode[0].ivaExento != true) && (impuestoInterno != "T" && impuestoInterno != true)) {
                  importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
                } else {
                  if (impuestoInterno != "T" && impuestoInterno != true) {
                    importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
                    objRecord.setSublistValue("item", "custcol_l54_iva_exento", repItem, true);
                  }
                }
              }
              objRecord.setSublistValue("item", "custcol_l54_importe_neto_gravado", repItem, importeNetoGravado);
              objRecord.setSublistValue("item", "custcol_l54_importe_neto_no_gravado", repItem, importeNetoNoGravado);
              objRecord.setSublistValue("item", "custcol_l54_importe_exento", repItem, importeExento);
            }

            if (esPercepcion == "T" || esPercepcion == true) {
              objRecord.setSublistValue("item", "custcol_l54_es_percepcion", repItem, true);
              if (!isEmpty(taxRate)) {
                let porcentajeParaAplicar;
                if (String(taxRate).indexOf("%") != -1) {
                  porcentajeParaAplicar = taxRate.substring(0, taxRate.length - 1);
                } else {
                  porcentajeParaAplicar = (parseFloat(taxRate, 10));
                }
                objRecord.setSublistValue("item", "custcol_l54_alicuota", repItem, porcentajeParaAplicar);
              }
            }

            if (esOtroTributo == "T" || esOtroTributo == true) {
              objRecord.setSublistValue("item", "custcol_l54_otros_tributos", repItem, true);
            }

            log.debug(proceso, "LINE 490 - Se actualizo la linea de articulos en la Transaccion exitosamente.");
          }
        }

        for (let repExpense = 0; repExpense < countExpenses; repExpense++) {

          const importe_neto = objRecord.getSublistValue("expense", "amount", repExpense);
          const importe_iva = objRecord.getSublistValue("expense", "taxamount", repExpense);
          const transCodImpuesto = objRecord.getSublistValue("expense", "custcol_l54_codigo_impuesto", repExpense);
          log.debug(proceso, "taxcode=" + transCodImpuesto);
          const impuestoInterno = objRecord.getSublistValue("expense", "custcol_l54_impuesto_interno", repExpense);
          let esPercepcion = "F";
          const porcentajeImpuestoParcial = objRecord.getSublistValue("expense", "custcol_l54_tasa_impuesto", repExpense);
          let porcentajeImpuesto = porcentajeImpuestoParcial;

          if (String(porcentajeImpuestoParcial).indexOf("%") != -1) {
            porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
          }
          porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

          const infoTaxCode = (!isEmpty(transCodImpuesto) && !isEmpty(arrayTaxCodes) && arrayTaxCodes.length > 0) ? arrayTaxCodes.includes((obj) => { return obj.idInterno == transCodImpuesto; }) : [];
          let codigoImpuestoAFIP = "";
          let excluirImpuestoAFIP = "F";

          if (!isEmpty(infoTaxCode) && infoTaxCode.length > 0) {
            excluirImpuestoAFIP = infoTaxCode[0].excluirProcesoTXTCV;
            esPercepcion = infoTaxCode[0].esPercepcion;
            if (isEmpty(excluirImpuestoAFIP))
              excluirImpuestoAFIP = "F";
            if (excluirImpuestoAFIP != "T" && excluirImpuestoAFIP != true)
              codigoImpuestoAFIP = infoTaxCode[0].idImpuestoAFIP;

            const columnaAcumulacion = infoTaxCode[0].colAcumulacion;
            if (!isEmpty(columnaAcumulacion)) {
              objRecord.setSublistValue("expense", "custcol_l54_col_acumulacion_vtas", repExpense, columnaAcumulacion);
            }
            const tipoPercepcion = infoTaxCode[0].tipoPercepcion;
            if (!isEmpty(tipoPercepcion)) {
              objRecord.setSublistValue("expense", "custcol_l54_tipo_percepcion_vtas", repExpense, tipoPercepcion);
            }
          }

          if (!isEmpty(codigoImpuestoAFIP) && importe_iva != 0) {
            objRecord.setSublistValue("expense", "custcol_l54_id_tipo_impuesto", repExpense, codigoImpuestoAFIP);
              if (!arrayAlicuotas.includes(codigoImpuestoAFIP)) {
              arrayAlicuotas.push(codigoImpuestoAFIP);
            }
          }

          let importeNetoNoGravado = 0.00;
          let importeNetoGravado = 0.00;
          let importeExento = 0.00;
          const tipoItem = objRecord.getSublistValue("expense", "itemtype", repExpense);
          if (tipoItem == "Discount") {
            const importe = parseFloat((importe_neto * tc), 10);
            setearImporteDondeHayaValorEnLaColumnaAnterior(objRecord, "expense", repExpense, importe);
          } else if (importe_iva != 0 && !isEmpty(importe_iva) && importe_iva != "" && (esPercepcion == "F" || esPercepcion == false)) {
            importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
            objRecord.setSublistValue("expense", "custcol_l54_importe_neto_no_gravado", repExpense, importeNetoNoGravado);
            objRecord.setSublistValue("expense", "custcol_l54_importe_neto_gravado", repExpense, importeNetoGravado);
            objRecord.setSublistValue("expense", "custcol_l54_importe_exento", repExpense, importeExento);
          } else {
            if (esPercepcion == "T" || esPercepcion == true) {
              importeNetoNoGravado = parseFloat(0.00, 10);
            } else {
              if (!isEmpty(infoTaxCode) && infoTaxCode.length > 0 && (infoTaxCode[0].ivaExento != "T" && infoTaxCode[0].ivaExento != true) && (impuestoInterno != "T" && impuestoInterno != true)) {
                importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
              } else {
                if (impuestoInterno != "T" && impuestoInterno != true) {
                  importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
                  objRecord.setSublistValue("expense", "custcol_l54_iva_exento", repExpense, true);
                }
              }
            }
            objRecord.setSublistValue("expense", "custcol_l54_importe_neto_gravado", repExpense, importeNetoGravado);
            objRecord.setSublistValue("expense", "custcol_l54_importe_neto_no_gravado", repExpense, importeNetoNoGravado);
            objRecord.setSublistValue("expense", "custcol_l54_importe_exento", repExpense, importeExento);
          }
          if (esPercepcion == "T" || esPercepcion == true) {
            objRecord.setSublistValue("expense", "custcol_l54_es_percepcion", repExpense, true);
          }

          log.debug(proceso, "LINE 576 - Se actualizo la linea de Gastos en la Transaccion exitosamente.");
        }

        // INICIO - NUEVO PARA COSTOS DE ENVIO
        let importeNetoGravadoEnvio = parseFloat(0.00, 10).toFixedOK(2);
        let importeNetoNoGravadoEnvio = parseFloat(0.00, 10).toFixedOK(2);
        let importeExentoEnvio = parseFloat(0.00, 10).toFixedOK(2);
        let EsEnvioExento = false;
        let IDEnvioAFIP = "";
        let importeImpuestoEnvio = parseFloat(0.00, 10).toFixedOK(2);
        let tasaImpuestoEnvio = 0;
        let columnaAcumulacionImpEnvio = "";
        let codigoImpuestoAFIP = "";
        // ! En suitetax el costo de envio no se maneja bien, netsuite no lo soporta correctamente, asi que va en 0.
        // const costoEnvio = objRecord.getValue("shippingcost");
        const costoEnvio = 0;
        if (costoEnvio != 0.00 && costoEnvio != 0 && costoEnvio != "") {
          // const tipoImpEnvio = objRecord.getValue("shippingtaxcode");
          const tipoImpEnvio = null;
          if (!isEmpty(tipoImpEnvio)) {
            // Busco el Tipo de Impuesto


            let esIVAExento = false;


            const infoTaxCode = (!isEmpty(tipoImpEnvio) && !isEmpty(arrayTaxCodes) && arrayTaxCodes.length > 0) ? arrayTaxCodes.includes((obj) => { return obj.idInterno == tipoImpEnvio; }) : [];
            log.debug(proceso, "LINE 647 infoTaxCode=" + JSON.stringify(infoTaxCode));
            if (!isEmpty(infoTaxCode) && infoTaxCode.length > 0) {
              let excluirImpuestoAFIP = infoTaxCode[0].excluirProcesoTXTCV;
              esIVAExento = infoTaxCode[0].ivaExento;
              if (esIVAExento == "T" || esIVAExento == true)
                esIVAExento = true;

              if (!isEmpty(infoTaxCode[0].colAcumulacion))
                columnaAcumulacionImpEnvio = infoTaxCode[0].colAcumulacion;

              if (isEmpty(excluirImpuestoAFIP))
                excluirImpuestoAFIP = "F";
              if (excluirImpuestoAFIP != "T" && excluirImpuestoAFIP != true)
                codigoImpuestoAFIP = infoTaxCode[0].idImpuestoAFIP;
            }

            if (!isEmpty(codigoImpuestoAFIP)) {
              IDEnvioAFIP = codigoImpuestoAFIP;
              if (!arrayAlicuotas.includes(codigoImpuestoAFIP)) {
                arrayAlicuotas.push(codigoImpuestoAFIP);
              }
            }

            const porcentajeImpEnvio = objRecord.getValue("shippingtax1rate");
            tasaImpuestoEnvio = porcentajeImpEnvio;
            let porcentajeImpEnvioFinal = 0;
            if (!isEmpty(porcentajeImpEnvio)) {
              porcentajeImpEnvioFinal = parseFloat((parseFloat(porcentajeImpEnvio, 10) / 100), 10);
            }

            if (porcentajeImpEnvioFinal == 0 || isEmpty(porcentajeImpEnvioFinal)) {
              if (esIVAExento == true || esIVAExento == "T") {
                // SI ES IVA EXENTO
                importeExentoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
                EsEnvioExento = true;
              } else {
                // Si es IVA NO GRAVADO
                importeNetoNoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
              }
            } else {
              importeNetoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
              // Calculo el Importe de Impuesto de Envio
              importeImpuestoEnvio = parseFloat(parseFloat(importeNetoGravadoEnvio, 10) * parseFloat(porcentajeImpEnvioFinal, 10), 10).toFixedOK(2);
            }
          } else {
            importeNetoNoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
          }

        }

        objRecord.setValue("custbody_l54_id_imp_afip_envio", IDEnvioAFIP);
        objRecord.setValue("custbody_l54_col_acum_imp_env", columnaAcumulacionImpEnvio);
        objRecord.setValue("custbody_l54_tasa_imp_envio", tasaImpuestoEnvio);
        objRecord.setValue("custbody_l54_es_imp_exento_envio", EsEnvioExento);
        objRecord.setValue("custbody_l54_imp_n_grav_envio", importeNetoGravadoEnvio);
        objRecord.setValue("custbody_l54_imp_n_ngrav_envio", importeNetoNoGravadoEnvio);
        objRecord.setValue("custbody_l54_imp_impuesto_envio", importeImpuestoEnvio);
        objRecord.setValue("custbody_l54_imp_exento_envio", importeExentoEnvio);

        // FIN - NUEVO PARA COSTOS DE ENVIO
        if (arrayAlicuotas.length > 0) {
          objRecord.setValue("custbody_l54_cant_alicuotas", arrayAlicuotas.length);
        } else {
          objRecord.setValue("custbody_l54_cant_alicuotas", 0);
        }
      } catch (e) {
        log.error(proceso, "Error guardando la transacción y actualizando las lineas - NetSuite error: " + e.message);
      }
    }

    /**
     * Establece el importe en la misma columna anterior de una sublist en un registro de NetSuite
     * si hay un valor en esa columna.
     * @param {N/record.Record} objRecord - El objeto de registro en el que se actualizará la sublist.
     * @param {string} sublistName - El nombre de la sublist en la que se actualizará el importe ("item" o "expense").
     * @param {number} currentPos - La posición actual de la columna.
     * @param {number} importe - El importe que se establecerá
     * @returns {void}
     */
    function setearImporteDondeHayaValorEnLaColumnaAnterior(objRecord, sublistName, currentPos, importe) {
      const anterior = currentPos - 1;
      if (anterior < 0) return; // puso el descuento como primero, no deberia hacerlo
      const columnasProbar = ["custcol_l54_importe_neto_gravado", "custcol_l54_importe_neto_no_gravado", "custcol_l54_importe_exento"];
      for (const col of columnasProbar) {
        const v = objRecord.getSublistValue(sublistName, col, anterior);
        if (!isEmpty(v) && Number(v) != 0) {
          objRecord.setSublistValue(sublistName, col, currentPos, importe);
        } else {
          objRecord.setSublistValue(sublistName, col, currentPos, 0);
        }
      }
    }

    function getResultsSalesTaxItem() {

      const proceso = "getResultsSalesTaxItem";
      const response = { error: false, mensaje: "", infoResultados: [] };

      try {
        const filtros = [];
        const objResultSet = utilidades.searchSavedPro("customsearch_l54_codigos_imp_circ_ventas", filtros);

        if (!objResultSet.error) {

          const resultSet = objResultSet.objRsponseFunction.result;
          const resultSearch = objResultSet.objRsponseFunction.search;

          if (!isEmpty(resultSet) && resultSet.length > 0) {
            for (const results of resultSet) {
              const info = {};
              info.idInterno = results.getValue({ name: resultSearch.columns[0] }); //Get internalid
              info.nameTaxCode = results.getValue({ name: resultSearch.columns[1] }); //Get Name
              info.excluirProcesoTXTCV = results.getValue({ name: resultSearch.columns[2] }); //Get Excluir del Proceso de TXT CV
              info.idImpuestoAFIP = results.getValue({ name: resultSearch.columns[3] }); //Get ID impuesto AFIP
              info.colAcumulacion = results.getValue({ name: resultSearch.columns[4] }); //Get Columna Acumulación
              info.tipoPercepcion = results.getValue({ name: resultSearch.columns[5] }); //Get Tipo Percepción
              info.ivaExento = results.getValue({ name: resultSearch.columns[6] }); //Get IVA Exento
              info.esPercepcion = results.getValue({ name: resultSearch.columns[7] }); //Get Es Percepción
              info.esOtroTributo = results.getValue({ name: resultSearch.columns[8] }); //Get Es Otro Tributo
              response.infoResultados.push(info);
            }
          } else {
            log.error(proceso, "No se encontró ningún resultado de código de impuesto para la subsidiaria Argentina");
          }
        } else {
          log.error(proceso, "Error intentando obtener información del SS: \"L54 - Códigos de Impuestos (Circuito Ventas)\" - Detalles: " + objResultSet.descripcion);
        }
      } catch (error) {
        response.error = true;
        response.mensaje = "Error NetSuite - Excepción mientras se obtenían los códigos de impuestos - Detalles: " + error.message;
        log.error(proceso, response.mensaje);
      }

      return response;
    }

    Number.prototype.toFixedOK = function (decimals) {
      const sign = this >= 0 ? 1 : -1;
      return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    };

    function obtenerDatosClienteOptimizado(idclienteTransaccion) {
        // Intentar como cliente primero, luego como job
        const campos = ["custentity_l54_tipo_contribuyente_iibb", "custentity_l54_exencion_per_iva", "custentity_l54_exencion_fec_cad"];
        
        try {
          return search.lookupFields({
            type: record.Type.CUSTOMER,
            id: idclienteTransaccion,
            columns: campos
          });
        } catch (error) {
          try {
            return search.lookupFields({
              type: record.Type.JOB,
              id: idclienteTransaccion,
              columns: campos
            });
          } catch (errorJob) {
            throw new Error(`No se pudo cargar ni como cliente ni como proyecto: ${errorJob.message}`);
          }
        }
      }

    function calcularPercepcionesVentas(calcularPercepciones, currentScript, objRecord) {

      const proceso = "calcularPercepcionesVentas";

      try {
        log.debug(proceso, "LINE 769 - Inicio de Cálculo de Percepciones Manual");
        log.audit("Governance Monitoring", "LINE 770 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());

        var letraDocumento = objRecord.getText('custbody_l54_letra');

        const idclienteTransaccion = objRecord.getValue("entity");
        log.debug(proceso, "LINE 773 - objRecord.isDynamic: " + objRecord.isDynamic + " - objRecord.type: " + objRecord.type + " - Letra documento: " + letraDocumento + " - idclienteTransaccion: " + idclienteTransaccion);
        
        const clienteData = obtenerDatosClienteOptimizado(idclienteTransaccion);
        
         let idTipoContribIIBB = clienteData.custentity_l54_tipo_contribuyente_iibb?.[0]?.value;

          const excepcionIVA = Utils.convertToBoolean(clienteData.custentity_l54_exencion_per_iva);
          
        let calcularPercepcionesAux = false;

       var fechaCaducExcepIVA = clienteData.custentity_l54_exencion_fec_cad;
          
          var fechaActual = objRecord.getValue('trandate');


        var caducoExepcion = false;
        
        if (!isEmpty(fechaCaducExcepIVA)) {
          if (fechaActual < fechaCaducExcepIVA) {
                caducoExepcion = false;
                //alert('Aun no caduca la Exepcion');
          } else if (fechaActual > fechaCaducExcepIVA) {
                caducoExepcion = true;
                //alert('La Exepcion Caduco');
          } else {
                caducoExepcion = false;
                //alert('La fecha es igual');
            }
        }

        if (calcularPercepciones == true) {
          calcularPercepcionesAux = calcularPercepciones;
        }
        log.debug(proceso, "calcularPercepciones: " + calcularPercepciones + " - calcularPercepcionesAux: " + calcularPercepcionesAux);

        if (isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion))) {
          log.debug(proceso, "No se puede continuar el proceso de cálculo de percepciones porque no tiene configurado Tipo Contribuyente IIBB en el registro del cliente. Por favor, verifique/edite el registro y vuelva a intentar.");
        } else {
          log.debug(proceso, "LINE 833 idTipoContribIIBB=" + idTipoContribIIBB);
          const regTipoContribIIBB = record.load({
            type: "customrecord_l54_tipo_contribuyente_iibb",
            id: idTipoContribIIBB
          });
          const nameTipoContribIIBB = regTipoContribIIBB.getValue("name");
          const llevaPercepcion = convertToBoolean(regTipoContribIIBB.getValue("custrecord_l54_calcula_percepcion"));


          log.debug(proceso, "LINE 821 - nameTipoContribIIBB: " + nameTipoContribIIBB + " - calcula percepcion según el tipo de contribuyente (llevaPercepcion): " + llevaPercepcion + ". IMPORTANTE: Si \"llevaPercepcion\" es F, no calcula percepciones.");

        
            if (llevaPercepcion == false && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion))) {
                log.debug(proceso, "No se calcula percepción debido a que el Cliente Pertenece al Tipo de Contribuyente : " + nameTipoContribIIBB + ", el cual está configurado para que no calcule percepciones.");
            } else {
                if (letraDocumento == "E") {
                log.debug(proceso, "Las facturas de letra E no aplican al cálculo de percepciones.");
                } else {

                let total = parseFloat(objRecord.getValue("total"), 10);
                let total_aux = total;
                log.debug(proceso, "LINE 832 - Total inicial: " + total);
                let totalDiscount = 0;

                for (let r = 0; r < objRecord.getLineCount("item"); r++) {
                    const tipoItem = objRecord.getSublistValue("item", "itemtype", r);
                    const amountItem = objRecord.getSublistValue("item", "amount", r);
                    const esPercepcion = objRecord.getSublistValue("item", "custcol_l54_pv_creada", r);
                    const esImpuestoInterno = objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", r);

                    totalDiscount += (!isEmpty(tipoItem) && tipoItem == "Discount") ? Math.abs(parseFloat(amountItem, 10)) : 0;

                    log.debug(proceso, "tipoItem: " + tipoItem + " - amountItem: " + amountItem + " - esPercepcion: " + esPercepcion + " - esImpuestoInterno: " + esImpuestoInterno);

                    if ((calcularPercepciones == "T" || calcularPercepciones == true) && (esPercepcion == "T" || esPercepcion == true || esImpuestoInterno == "T" || esImpuestoInterno == true)) {

                    if (esImpuestoInterno != "T" && esImpuestoInterno != true) {
                        //Se restan las percepciones al total de la factura para sacar el total sin percepciones
                        total -= parseFloat(objRecord.getSublistValue("item", "taxamount", r), 10);
                    }

                      total_aux -= parseFloat(objRecord.getSublistValue("item", "taxamount", r), 10);

                      /* let lineNum = objRecord.selectLine({ sublistId: 'item', line: r });*/
                      let taxReferences = objRecord.getSublistValue("item", "taxdetailsreference", r);
                     deleteTaxDetailLine(objRecord, taxReferences);

                      //objRecord.removeLine({ sublistId: 'item', line: r });
                      
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                }

                if (calcularPercepciones == true) {
                  /* INICIO - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */

                  var cantidadAcumulados = objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc");
                  log.debug('calcularPercepciones', 'LINE 194 - CANTIDAD ACUMULADOS: ' + cantidadAcumulados);

                  for (var j = 0; j < objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc"); j++) {
                      //objRecord.selectLine("recmachcustrecord_l54_acum_perc_trans_asoc", j);
                      objRecord.removeLine("recmachcustrecord_l54_acum_perc_trans_asoc", j);
                      j--;
                  }

                  /* FIN - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */
                }
                

                const tipoCambio = parseFloat(objRecord.getValue("exchangerate"), 10);
                //Valor del total sin percepciones en moneda local
                const total_moneda_local = parseFloat(parseFloat(total, 10) * parseFloat(tipoCambio, 10), 10);
                log.debug(proceso, "TipoCambio Transaccion: " + tipoCambio + " - Total Transaccion (Sin Percepciones): " + total_aux + " - Total Transaccion Monena Local (Sin Percepciones): " + total_moneda_local + " - Total Transaccion Monena Local (Sin Percepciones).toFixed(2): " + (total_moneda_local).toFixed(2) + " - TipoTransaccion: " + objRecord.type + " - calcularPercepcionesAux: " + calcularPercepcionesAux + " - Discount: " + totalDiscount);
                // !esta validación se maneja en el script "L54 - Validar Percepciones para NC (UE).js"		
                // Verificación de cálculo de percepciones para NC parciales.
                // if (objRecord.type == "creditmemo" && (calcularPercepcionesAux == "T" || calcularPercepcionesAux == true)) {
                //   const transaccion_referencia = isEmpty(objRecord.getValue("custbody_l54_transaccion_referencia")) ? objRecord.getValue("createdfrom") : objRecord.getValue("custbody_l54_transaccion_referencia");

                //   if (!isEmpty(transaccion_referencia)) {

                //     try {
                //       //obtengo información de la referencia de la NC
                //       const resultadoTransRef = getInfoTransReferencia(transaccion_referencia);

                //       if (!isEmpty(resultadoTransRef) && !resultadoTransRef.error && !isEmpty(resultadoTransRef.datosReferencia)) {
                //         const idTransRef = resultadoTransRef.datosReferencia.idTransRef;
                //         let totalTransRef = resultadoTransRef.datosReferencia.totalTransRef;
                //         const recordTypeTransRef = resultadoTransRef.datosReferencia.recordTypeTransRef;
                //         const referenciaOfTransRef = resultadoTransRef.datosReferencia.referenciaOfTransRef;

                //         log.debug(proceso, " LINE 881 - tipoCambio: " + tipoCambio + " - total:  " + total + " - total_moneda_local: " + total_moneda_local + " - total_moneda_local.toFixed(2): " + (total_moneda_local).toFixed(2) + " - totalTransRef: " + totalTransRef + " - recordTypeTransRef:  " + recordTypeTransRef + " - idTransRef: " + idTransRef + " - referenciaOfTransRef: " + referenciaOfTransRef);

                //         if ((recordTypeTransRef == "RtnAuth" || recordTypeTransRef == "returnauthorization") && !isEmpty(referenciaOfTransRef)) {
                //           log.debug(proceso, "Transacción de referencia es returnauthorization, id interno: " + idTransRef + " - Referencia de la autorización de devolución, id interno: " + referenciaOfTransRef);
                //           const refAutorizacionDev = getInfoTransReferencia(parseInt(referenciaOfTransRef), 10);
                //           totalTransRef = 0.00;

                //           if (!isEmpty(refAutorizacionDev) && !refAutorizacionDev.error && !isEmpty(refAutorizacionDev.datosReferencia)) {
                //             const idRefReturnAut = refAutorizacionDev.datosReferencia.idTransRef;
                //             totalTransRef = !isEmpty(refAutorizacionDev.datosReferencia.totalTransRef) ? refAutorizacionDev.datosReferencia.totalTransRef : 0;
                //             log.debug(proceso, "totalTransRef (Transaccion Relacionada a returnauthorization): " + totalTransRef + " - idRefReturnAut (Transaccion Relacionada a returnauthorization): " + idRefReturnAut);
                //           } else {
                //             errorObteniendoReferencia = true;
                //             log.error(proceso, refAutorizacionDev.mensaje);
                //           }
                //         }

                //         if (!errorObteniendoReferencia) {
                //           totalRestaImportes = parseFloat(parseFloat(totalTransRef, 10) - parseFloat(total_moneda_local, 10), 10);
                //           log.debug(proceso, "totalTransRef: " + totalTransRef + " - total_moneda_local: " + total_moneda_local + " - Total Resta Importes: " + totalRestaImportes + " - difPermitida: " + difPermitida);

                //           if (parseFloat(totalRestaImportes, 10) > parseFloat(difPermitida, 10)) {
                //             esNcParcial = true;
                //             log.error(proceso, "A las notas de crédito parciales no se les calcula percepciones. Se procede a comprobar si se realiza el Cálculo de Impuestos Internos.");
                //           }
                //         }
                //       } else {
                //         errorObteniendoReferencia = true;
                //         log.error(proceso, resultadoTransRef.mensaje);
                //       }
                //     } catch (error) {
                //       log.error(proceso, "LINE 164- Exception error NC Parciales: " + error.message);
                //     }
                //   }
                // }
                // !FIN esta validación se maneja en el script "L54 - Validar Percepciones para NC (UE).js"

                // calcularPercepcionesAux = "T"; // no cambia nunca, asi esta en prod. 24/4/2023, proceso migracion script reingeneria argentina}
                log.audit(proceso, "obtener informacion de la transaccion");
                // Obtengo informacion de la Transaccion
                var letra = objRecord.getText('custbody_l54_letra');
                const subTotal = objRecord.getValue("subtotal");
                const discounttotal = objRecord.getValue("discounttotal");
                let subsidiariaTransaccion = null;
                const esOneWorld = utilidades.l54esOneworld();
                if (esOneWorld) {
                  subsidiariaTransaccion = objRecord.getValue('subsidiary');
                  subsidiariaText = objRecord.getText('subsidiary');
                }

                const costoEnvio = !isEmpty(objRecord.getValue("shippingcost")) ? objRecord.getValue("shippingcost") : 0;

                var jurisdiccionDireccionEntrega=objRecord.getValue('custbody_l54_jurisdiccion_entrega');
                var jurisdiccionDireccionEntregaText=objRecord.getText('custbody_l54_jurisdiccion_entrega');

                log.debug(proceso, "despues de jurisdiccionDireccionEntregaText= " + jurisdiccionDireccionEntregaText);


                const tipoContribuyente = objRecord.getValue("custbody_l54_tipo_contribuyente");
                log.debug(proceso, "LINE 929 - jurisdiccionDireccionEntrega: " + jurisdiccionDireccionEntrega + " - jurisdiccionDireccionEntregaText: " + jurisdiccionDireccionEntregaText);

                // Inicio Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
                const informacionTransaccion = {};
                const trandate = objRecord.getValue("trandate");
                log.debug(proceso, "LINE 934 - Trandate antes de parsear: " + trandate);
                // informacionTransaccion.trandate = nlapiStringToDate(trandate);
                informacionTransaccion.periodo = objRecord.getValue("postingperiod");
                informacionTransaccion.trandate = format.parse({
                    value: trandate,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });
                log.debug(proceso, "LINE 941 - Trandate: " + informacionTransaccion.trandate);
                informacionTransaccion.cliente = idclienteTransaccion;
                informacionTransaccion.total = total_aux.toFixedOK(2);
                informacionTransaccion.subTotal = subTotal;
                informacionTransaccion.discounttotal = discounttotal;
                informacionTransaccion.tipoCambio = tipoCambio;
                informacionTransaccion.subsidiaria = subsidiariaTransaccion;
                informacionTransaccion.subsidiariaText = subsidiariaText;
                informacionTransaccion.esOneWorld = esOneWorld;
                informacionTransaccion.costoEnvio = costoEnvio;
                informacionTransaccion.idTransaccion = objRecord.id;
                log.debug(proceso, "LINE 950 - llevaPercepcion:  " + llevaPercepcion + " - calcularPercepcionesAux: " + calcularPercepcionesAux);

                // INICIO Nuevo - Considerar Jurisdiccion de Entrega
                informacionTransaccion.jurisdiccionEntrega = "";
                informacionTransaccion.jurisdiccionEntregaText = "";
                informacionTransaccion.coeficienteBaseImponible = isEmpty(objRecord.getValue("custbody_l54_coeficiente_base_imp")) ? 1.00 : objRecord.getValue("custbody_l54_coeficiente_base_imp");
                informacionTransaccion.jurisdiccionDireccionEntrega = "";
                informacionTransaccion.jurisdiccionDireccionEntregaText = "";
                informacionTransaccion.tipoContribuyente = tipoContribuyente;
                informacionTransaccion.totalDiscount = totalDiscount;

                if (!isEmpty(jurisdiccionDireccionEntrega)) {
                    informacionTransaccion.jurisdiccionDireccionEntrega = jurisdiccionDireccionEntrega;
                    informacionTransaccion.jurisdiccionDireccionEntregaText = jurisdiccionDireccionEntregaText;
                }
                // FIN Nuevo - Considerar Jurisdiccion de Entrega

                informacionTransaccion.articulos = new Array();

                // INICIO Informacion Para Impuestos Internos
                informacionTransaccion.informacionImpInterno = new Object();
                informacionTransaccion.informacionImpInterno.calcularImp = false;
                informacionTransaccion.informacionImpInterno.montoImpInterno = parseFloat(0, 10);
                informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(0, 10);
                informacionTransaccion.informacion_articulos_iva = new Array();
                // FIN Informacion Para Impuestos Internos

                // INICIO NUEVO enviar informacion de si se debe calcular las percepciones o no
                informacionTransaccion.letra = letra;
                informacionTransaccion.nameTipoContribIIBB = nameTipoContribIIBB;
                informacionTransaccion.llevaPercepcion = llevaPercepcion;
                informacionTransaccion.calcularPercepciones = false;
                informacionTransaccion.calcularPercepcionesIVA = false;
                //Si la letra es E o llevaPercepcion es 'F' no se calculan percepciones
                
                if ((!isEmpty(calcularPercepciones) && calcularPercepciones && letra != 'E' && llevaPercepcion && calcularPercepcionesAux)) {
                   // se entra por validacion de ingresos brutos
                    informacionTransaccion.calcularPercepciones = true;
                }

                if ((excepcionIVA == false || (excepcionIVA && caducoExepcion)) && calcularPercepciones == true) {
                  informacionTransaccion.calcularPercepcionesIVA = true;
                }
                

                // FIN NUEVO enviar informacion de si se debe calcular las percepciones o no
                log.debug(proceso, "calcularPercepciones: " + calcularPercepciones + " - letraDocumento: " + letraDocumento + " - llevaPercepcion: " + llevaPercepcion + " - calcularPercepcionesAux: " + calcularPercepcionesAux);
                log.debug(proceso, "informacionTransaccion.calcularPercepciones: " + informacionTransaccion.calcularPercepciones);

                // Inicio Obtener Informacion de los Articulos
                let contadorArticulos = 0;
                const numberOfItems = objRecord.getLineCount("item");

                for (let i = 0; i < numberOfItems; i++) {

                    const item = objRecord.getSublistValue("item", "item", i);
                    const cantidad = objRecord.getSublistValue("item", "quantity", i);
                    //const itemImporte = objRecord.getSublistValue("item", "amount", i);
                    const tipoItem = objRecord.getSublistValue("item", "itemtype", i);

                    let itemBienDeUso = objRecord.getSublistValue("item", "custcol_l54_pv_bien_de_uso", i);
                    itemBienDeUso = (!isEmpty(itemBienDeUso) && (itemBienDeUso == true || itemBienDeUso == "T"));

                    const tipoProducto = objRecord.getSublistValue("item", "custcol_l54_tipo_producto", i);
                    const referenciaTaxDetail = objRecord.getSublistValue("item", "taxdetailsreference", i);
                    const objectTaxDetails = findTaxDetailLine(objRecord, referenciaTaxDetail);
                    const codigoImpuesto = objectTaxDetails.taxCode;
                    const importeImpuestoIVA = objectTaxDetails.taxAmount;
                    const importeBrutoItem = objectTaxDetails.grossAmount;
                    const itemImporte = objectTaxDetails.netAmount;

                    let otrosTributos = objRecord.getSublistValue("item", "custcol_l54_otros_tributos", i);
                    log.debug(proceso, "otrosTributos: " + otrosTributos);
                    otrosTributos = (!isEmpty(otrosTributos) && (otrosTributos == true || otrosTributos == "T"));

                    let impuestoInterno = objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", i);
                    log.debug(proceso, "impuestoInterno: " + impuestoInterno);
                    impuestoInterno = (!isEmpty(impuestoInterno) && (impuestoInterno == true || impuestoInterno == "T"));

                    let esPercepcion = objRecord.getSublistValue("item", "custcol_l54_pv_creada", i);
                    log.debug(proceso, "esPercepcion: " + esPercepcion);
                    esPercepcion = (!isEmpty(esPercepcion) && (esPercepcion == true || esPercepcion == "T"));

                    // Los Items de Descuento tenerlos en Cuenta
                    if (itemBienDeUso == false && !isEmpty(itemImporte) && (tipoItem == "Discount" || (!isEmpty(cantidad) && cantidad > 0)) && otrosTributos == false && impuestoInterno == false && esPercepcion == false) {

                    if (tipoItem != 'Discount' && tipoItem != 'Description' && tipoItem != 'Subtotal') {
                        informacionTransaccion.articulos[contadorArticulos] = new Object();
                        informacionTransaccion.articulos[contadorArticulos] = obtenerDatosLineas(objRecord, item, itemImporte, importeBrutoItem, i);
                    } else if (tipoItem == 'Discount') {
                        informacionTransaccion.articulos[contadorArticulos - 1].importeBrutoLinea += parseFloat(importeBrutoItem, 10);
                        informacionTransaccion.articulos[contadorArticulos - 1].importeNetoLinea += parseFloat(itemImporte, 10);
                    }

                    contadorArticulos = parseInt(contadorArticulos, 10) + parseInt(1, 10);

                    // INICIO Enviar InformaciÃ³n Para CAclular Impuesto Interno
                    if (tipoItem != "Discount") {
                        const porcentajeImpuestoInterno = objRecord.getSublistValue("item", "custcol_3k_porc_imp_interno", i);
                        if (!isEmpty(porcentajeImpuestoInterno) && !isNaN(parseFloat(porcentajeImpuestoInterno, 10)) && parseFloat(porcentajeImpuestoInterno, 10) > 0) {
                        informacionTransaccion.informacionImpInterno.calcularImp = true;
                        informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(informacionTransaccion.informacionImpInterno.baseCalculo, 10) + parseFloat(itemImporte, 10);
                        informacionTransaccion.informacionImpInterno.montoImpInterno = parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno, 10) + parseFloat((parseFloat(porcentajeImpuestoInterno, 10) * parseFloat(itemImporte, 10) / 100), 10);
                        }

                    }
                    if (informacionTransaccion.calcularPercepcionesIVA == true) {

                        const objectIVA = new Object();
                        objectIVA.tipoProducto = tipoProducto;
                        objectIVA.tipoIVA = codigoImpuesto;
                        objectIVA.baseNetaImponible = parseFloat(itemImporte, 10);
                        objectIVA.baseImporteBruto = parseFloat(importeBrutoItem, 10);
                        objectIVA.baseImporteIVA = parseFloat(importeImpuestoIVA, 10);
                        //nlapiLogExecution('DEBUG','calcular_percepciones_ventas','LINE 313 Length Array: '+ informacionTransaccion.informacion_articulos_iva + "  typeOf:" + typeof informacionTransaccion.informacion_articulos_iva);
                        //nlapiLogExecution('DEBUG','calcular_percepciones_ventas','LINE 313 Is Array? : '+ informacionTransaccion.informacion_articulos_iva.isArray());
                        
                        let index = -1;
                        let encontrado = false;
                        for (let j = 0; j < informacionTransaccion.informacion_articulos_iva.length && encontrado == false; j++) {
                        //var element = array[index];
                        if (informacionTransaccion.informacion_articulos_iva[j].tipoIVA == codigoImpuesto && informacionTransaccion.informacion_articulos_iva[j].tipoProducto == tipoProducto) {
                            index = j;
                            encontrado = true;
                        }
                        }
                        // var index = informacionTransaccion.informacion_articulos_iva.findIndex(function(obj){
                        // 	return obj.tipoProducto == tipoProducto && obj.tipoIVA == codigoImpuesto;
                        // });
                        if (index >= 0) {
                        informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible, 10) + parseFloat(itemImporte, 10);
                        informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto, 10) + parseFloat(importeBrutoItem, 10);
                        informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA, 10) + parseFloat(importeImpuestoIVA, 10);
                        } else {
                        informacionTransaccion.informacion_articulos_iva.push(objectIVA);
                        }
                    }
                    // FIN Enviar InformaciÃ³n Para CAclular Impuesto Interno
                    }

                }

                var recTypeCalculo = objRecord.type;

                if (informacionTransaccion.informacionImpInterno.calcularImp == true || informacionTransaccion.calcularPercepciones == true || informacionTransaccion.calcularPercepcionesIVA == true) {
                    // Fin Obtener Informacion de los Articulos

                    informacionTransaccion.recTypeCalculo = recTypeCalculo;
                    if (!isEmpty(objRecord.type))
                      informacionTransaccion.recIdCalculo = objRecord.type;

                    informacionTransaccion.scriptOrigen = 'serverScript';

                    if (!isEmpty(numberOfItems) && numberOfItems > 0 && !isEmpty(contadorArticulos) && contadorArticulos > 0) {

                    // var objInformacionTransaccion = new Array();
                    const objInformacionTransaccion = {};
                    const informacionTransaccionJson = JSON.stringify(informacionTransaccion);
                    objInformacionTransaccion.informacionTransaccion = informacionTransaccionJson;

                    if (informacionTransaccion.calcularPercepciones == true) {
                        try {
                        log.debug(proceso, "INICIO llamada SuiteLet - Cálculo Automático");
                        // const new_url = url.resolveScript({
                        //     scriptId: "customscript_l54_calcular_percep_ventas",
                        //     deploymentId: "customdeploy_l54_calcular_percep_ventas",
                        //     returnExternalUrl: true
                        // });

                        /* let response = {"error":false,"warning":true,"mensajeError":[],"mensajeWarning":[" La percepción para la Jurisdicción: 924_Tucumán (configurada para calcular sólo por configuración de Padrón) no será calculada, debido a que la empresa no es Agente de Percepcion en la Jurisdicción. \n"],"mensajeOk":" \n Proceso PV finalizado. Se agregaron la cantidad de líneas de percepciones en ventas: 2","infoPercepciones":[{"item":"16","descripcion":"PERC IIBB Capital","cantidad":1,"importeUnitario":0,"importeTotal":0,"codigoImpuesto":"14","porcentaje":6,"jurisdiccion":"1","montoImponiblePercMonedaLocal":5500,"montoImponibleOriginal":5500,"procesoPV":"T","importeImpuestoOriginal":330,"importeImpuesto":330,"montoImponible":5500,"diferenciaRedondeo":0,"coeficienteBaseImponible":1,"montoImponiblePercOriginal":5500,"normaIIBB":"121","tipoContribuyenteIIBB":"1"},{"item":"16","descripcion":"PERC IIBB BS","cantidad":1,"importeUnitario":0,"importeTotal":0,"codigoImpuesto":"15","porcentaje":8,"jurisdiccion":"2","montoImponiblePercMonedaLocal":5500,"montoImponibleOriginal":5500,"procesoPV":"T","importeImpuestoOriginal":440,"importeImpuesto":440,"montoImponible":5500,"diferenciaRedondeo":0,"coeficienteBaseImponible":1,"montoImponiblePercOriginal":5500,"normaIIBB":"","tipoContribuyenteIIBB":"1"}],"cantidadLineasPercepcion":2,"errorImpInt":false,"warningImpInt":false,"mensajeErrorImpInt":[],"mensajeWarningImpInt":[],"mensajeOkImpInt":"Proceso Calculo Impuesto Interno finalizado. La Transaccion no genera Impuestos Internos","infoImpuestoInterno":[],"cantidadLineasImpInt":0};
                                            objRecord = callBackPercepciones(response, objRecord); */

                        /* let respuestaAux = https.post({
                                                url: new_url,
                                                body: objInformacionTransaccion
                                            }); */

                        // const response = https.post({
                        //     url: new_url,
                        //     body: objInformacionTransaccion,
                        // });

                        var customPlugin = plugin.loadImplementation({
                            type: 'customscript_l54_cal_per_tipo_pg',
                            implementation: 'customscript_l54_cal_per_calculo_pg'
                        });
                        log.debug("customPlugin", customPlugin)
                        let response = customPlugin.generarPercepciones(
                            objInformacionTransaccion
                        );

                        log.debug('Plugin executed successfully', response);

                        callBackPercepciones(response, objRecord);

                        log.debug(proceso, "FIN llamada SuiteLet - Cálculo Automático");
                        } catch (err) {
                        log.error(proceso, "LINE 1067 - Error Calculando Percepiones en Ventas - NetSuite error: " + err.message);
                        return objRecord;
                        }
                    }

                    //if (excepcionIVA == false && informacionTransaccion.calcularPercepcionesIVA == true) {
                    if (informacionTransaccion.calcularPercepcionesIVA == true) { 
                        try {
                        log.debug("calcularPercepcionesVentas", "Parametros Suitelet IVA: " + informacionTransaccionJson);
                        // const strURLIVA = nlapiResolveURL("SUITELET", "customscript_l54_cal_percep_ventas_iva", "customdeploy_l54_cal_percep_ventas_iva", true);
                        // const objRtaIVA = nlapiRequestURL(strURLIVA, objInformacionTransaccion, null, null);
                        const new_url = url.resolveScript({
                            scriptId: "customscript_l54_cal_percep_ventas_iva2",
                            deploymentId: "customdeploy_l54_cal_percep_ventas_iva2",
                            returnExternalUrl: true
                        });

                        const response = https.post({
                            url: new_url,
                            body: objInformacionTransaccion
                        });
                        callBackPercepcionesIVA(response, objRecord);
                        log.debug("calcularPercepcionesVentas", "FIN llamada SuiteLet IVA");

                        }

                        catch (err) {
                        log.error("calcularPercepcionesVentas", "IVA LINE 2520 - Error Calculando Percepiones en Ventas IVA - NetSuite error: " + err.message);
                        }
                    }
                    // Fin Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
                    } else {
                    // Si no Hay Articulos Para Calcular Percepciones en VENTAS
                    if (isEmpty(numberOfItems) || (!isEmpty(numberOfItems) && numberOfItems == 0)) {
                        log.debug(proceso, "No se ingresaron Articulos en la Transaccion");
                        return true;
                    } else {
                        if (objRecord.getLineCount("taxdetails") == 0) {
                        log.debug(proceso, "No se tiene TaxDetails. Por favor use el boton 'Preview Tax' para generar los TaxDetails");
                        } else {
                        log.debug(proceso, "Los Articulos Ingresados en la Transaccion No generan Percepciones");
                        }
                        return true;
                    }
                    }
                }
                }
          }
        }
        log.audit("Governance Monitoring", "LINE 327 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());
        log.debug(proceso, "FIN DEL CÁLCULO DE PERCEPCIONES MANUAL");
      } catch (err) {
        log.error(proceso, "Error - Proceso cálculo de percepciones: " + err.message);
        log.error(proceso, "LINE 349- Exception error NC Parciales:" + err.message);
      }
      return objRecord;
    }

    function isEmpty(value) {
      return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
    }

    function obtenerDatosLineas(objRecord, item, itemImporte, importeBrutoLinea, numberLine) {
    
      var datosLinea = {};
      datosLinea.idArticulo = item;
      datosLinea.importeBrutoLinea = parseFloat(importeBrutoLinea, 10);
      datosLinea.importeNetoLinea = parseFloat(itemImporte, 10);
      datosLinea.lineNumber = numberLine;
    
      /********************************* DATOS JURISDICCION UTILIZACION *****************************/
                            
      datosLinea.jurisdUtilizacion = objRecord.getSublistValue('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
      datosLinea.nombreJurisdUtilizacion = objRecord.getSublistText('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
                    
      /********************************* DATOS JURISDICCION UTILIZACION *****************************/
        
      /********************************* DATOS JURISDICCION ORIGEN *****************************/
        
      datosLinea.jurisdOrigen = objRecord.getSublistValue('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
      datosLinea.nombreJurisdOrigen = objRecord.getSublistText('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
                    
      /********************************* DATOS JURISDICCION ORIGEN *****************************/
                    
      /********************************* DATOS JURISDICCION ENTREGA *****************************/
        
      datosLinea.jurisdiccionEntrega = objRecord.getSublistValue('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
      datosLinea.jurisdiccionEntregaNombre = objRecord.getSublistText('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
        
      /********************************* DATOS JURISDICCION s *****************************/
        
      /********************************* DATOS JURISDICCION FACTURACION *****************************/
        
      datosLinea.jurisdFacturacion = objRecord.getSublistValue('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);
      datosLinea.nombreJurisdFacturacion = objRecord.getSublistText('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);
    
      /********************************* DATOS JURISDICCION FACTURACION *****************************/
    
      /********************************* DATOS JURISDICCION EMPRESA *****************************/
        
      datosLinea.jurisdEmpresa = objRecord.getSublistValue('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);
      datosLinea.nombreJurisdEmpresa = objRecord.getSublistText('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);
    
      /********************************* DATOS JURISDICCION EMPRESA *****************************/
    
      return datosLinea;
    }

    

    function callBackPercepciones(response, objRecord) {

      const proceso = "callBackPercepciones";
  
      try {
        log.debug(proceso, "INICIO callBackPercepciones - time: " + new Date());
        if (!isEmpty(response)) {
          const informacionPercepciones = JSON.parse(response.output);
          //const informacionPercepciones = JSON.parse(response.body)[0];
          const param_codigo_IVA = informacionPercepciones.codigo_IVA;

          if (!isEmpty(informacionPercepciones)) {
            log.debug(proceso, "LINE 1150 - informacionPercepciones: " + JSON.stringify(informacionPercepciones));

            objRecord.setValue({ fieldId: "taxdetailsoverride", value: true });
            let mensajeFinalAlert = "";
            if (informacionPercepciones.error == false) {
              var fecha = objRecord.getValue('trandate');
              
                  //INICIO - REGISTRO DE ACUMULADOS RETENCION IIBB
                  if (!isEmpty(informacionPercepciones.detalleAcumulados) && informacionPercepciones.detalleAcumulados.length > 0) {
                    for (var i = 0; i < informacionPercepciones.detalleAcumulados.length; i++) {
                        log.debug('calcularPercepciones', 'linea i: ' + i + ' / detalleAcumulados : ' + JSON.stringify(informacionPercepciones.detalleAcumulados[i]));
                        log.debug('cantiadad de linea', objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc"))
                        /*objRecord.selectNewLine("recmachcustrecord_l54_acum_perc_trans_asoc");

                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_cliente', informacionPercepciones.detalleAcumulados[i].cliente);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_periodo', informacionPercepciones.detalleAcumulados[i].periodo);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_subsidiaria', informacionPercepciones.detalleAcumulados[i].subsidiaria);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_base_calculo', informacionPercepciones.detalleAcumulados[i].baseCalculo);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_jurisdiccion', informacionPercepciones.detalleAcumulados[i].jurisdiccion);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_per_tipo_cambio', informacionPercepciones.detalleAcumulados[i].tipoCambio);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_fecha', fecha);
                        objRecord.setCurrentSublistValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_anulado', false);
                        
                        objRecord.commitLine('recmachcustrecord_l54_acum_perc_trans_asoc');*/
                        var indexFila = objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc");
                        objRecord.setSublistValue({ line: indexFila, sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_cliente", value: informacionPercepciones.detalleAcumulados[i].cliente});
                        if(!isEmpty(informacionPercepciones.detalleAcumulados[i].periodo)){
                          objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_periodo', value:informacionPercepciones.detalleAcumulados[i].periodo});
                        }
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_subsidiaria', value:informacionPercepciones.detalleAcumulados[i].subsidiaria});
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_base_calculo', value:informacionPercepciones.detalleAcumulados[i].baseCalculo});
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_jurisdiccion', value:informacionPercepciones.detalleAcumulados[i].jurisdiccion});
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_per_tipo_cambio', value:informacionPercepciones.detalleAcumulados[i].tipoCambio});
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_fecha', value:fecha});
                        objRecord.setSublistValue({ line: indexFila, sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc', fieldId:'custrecord_l54_acum_perc_anulado', value:false});
      
                    }
                }
                //FIN - REGISTRO DE ACUMULADOS RETENCION IIBB

              // Inicio Grabar Informacion de las Percepciones en la Transaccion
              if (!isEmpty(informacionPercepciones.infoPercepciones) && informacionPercepciones.infoPercepciones.length > 0) {
                // elimino las líneas de percepciones ventas que estaban generadas en esta transacción
                
                log.debug(proceso, "numberOfItems= " + objRecord.getLineCount("item"));
                for (let r = 0; r < objRecord.getLineCount("item"); r++) {
                  log.debug(proceso, "entramos al for de removeLine r=" + r);
                  if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_pv_creada", r)) == true && objRecord.getSublistValue("item", "custcol_l54_tipo_percepcion_vtas", r) != param_codigo_IVA) {
                    /* let lineNum = objRecord.selectLine({ sublistId: 'item', line: r });
                                        objRecord.removeLine({ sublistId: 'item', line: lineNum }); */
  
                    // objRecord.selectLine({ sublistId: "item", line: r });
                    let taxReferences = objRecord.getSublistValue("item", "taxdetailsreference", r);
                    deleteTaxDetailLine(objRecord, taxReferences);
                    objRecord.removeLine({ sublistId: "item", line: r });
                    r--;
                  }
                }
  
                for (let i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {
  
                  const porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));
  
                  if (!isEmpty(porcentajeAlicuota) && (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00)) {
  
                    const indexFila = objRecord.getLineCount("item");
                    log.debug(proceso, "dentro del for infoPercepciones numberOfItems= " + indexFila);
  
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "item", value: informacionPercepciones.infoPercepciones[i].item });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "description", value: informacionPercepciones.infoPercepciones[i].descripcion });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoPercepciones[i].cantidad });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoPercepciones[i].importeUnitario });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoPercepciones[i].importeTotal });
                    log.debug(proceso, "informacionPercepciones.infoPercepciones[i].codigoImpuesto= " + informacionPercepciones.infoPercepciones[i].codigoImpuesto);
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoPercepciones[i].codigoImpuesto });
  
  
                    // Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoPercepciones[i].porcentaje });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_jurisd_iibb_lineas", value: informacionPercepciones.infoPercepciones[i].jurisdiccion });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_pv_creada", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
  
                    // Imp. Perc. redondeado a dos decimales
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
  
                    // Imp. Perc. Original
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_percepcion_original", value: informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal });
  
                    // Diferencia por redondeo de Imp. Percepción
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_diferencia_redondeo", value: informacionPercepciones.infoPercepciones[i].diferenciaRedondeo });
  
                    // Base de cálculo redondeada
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_monto_imp_perc", value: informacionPercepciones.infoPercepciones[i].montoImponible });
  
                    // Base de cálculo original
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_calculo_original", value: informacionPercepciones.infoPercepciones[i].montoImponibleOriginal });
  
                    // Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_coeficiente_base_imp", value: informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_imponible_original", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_monto_suj_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].importePercMonedaLocal });
  
                    // Nuevo - Grabar Norma IIBB
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_norma_iibb_perc", value: informacionPercepciones.infoPercepciones[i].normaIIBB });
  
                    // Nuevo - Grabar Tipo Contribuyente IIBB
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tipo_contribuyente", value: informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB });
  
                    // Nuevo - Grabar Campo Alicuota
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_alicuota", value: informacionPercepciones.infoPercepciones[i].porcentaje });
  
                    // NUEVO
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_impint_sin_desc", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_impuesto_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_net_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_total_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxdetailsreference", value: "iibb" + i, ignoreFieldChange: false });
                   
                    // segmentos de linea
                    /*if(!isEmpty(informacionPercepciones.segmentoUbicacion)){
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "location", value: informacionPercepciones.segmentoUbicacion, ignoreFieldChange: true });
                    }*/
                    if (!isEmpty(informacionPercepciones.segmentoDepartamento)) {
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "department", value: informacionPercepciones.segmentoDepartamento, ignoreFieldChange: true });
                    }
                    if (!isEmpty(informacionPercepciones.segmentoClase)) {
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "class", value: informacionPercepciones.segmentoClase, ignoreFieldChange: true });
                    }
                    
  
                    if (objRecord.type == "salesorder") {
                      // Si es una Orden de Venta cerrar la linea
                      log.debug(proceso, "LINE 464 es una salesorder cerrar la linea - objRecord.type: " + objRecord.type);
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "isclosed", value: true });
                    }
  
                    let lineCount = objRecord.getLineCount({ sublistId: "item" });
                    const textoDetails = informacionPercepciones.infoPercepciones[i].descripcion;
                    lineCount = lineCount - 1;
                    const sublistFieldTaxDetail = objRecord.getSublistValue({
                      sublistId: "item",
                      fieldId: "taxdetailsreference",
                      line: lineCount
                    });
                    const objTaxDetailPercep = informacionPercepciones.infoPercepciones[i];
                    //var referenceDet = 'iibb'+i;
                    objRecord = agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails);
                  }
                }
                 
              }
              // Fin Grabar Informacion de las Percepciones en la Transaccion
              // Informo Warnings
              let mensajeWarning = "Aviso : \n ";
              if (informacionPercepciones.warning == true) {
                for (let i = 0; !isEmpty(informacionPercepciones.mensajeWarning) && i < informacionPercepciones.mensajeWarning.length; i++) {
                  mensajeWarning += ((i + 1) + " - " + informacionPercepciones.mensajeWarning[i] + "\n");
                }
                //alert(mensajeWarning);
                mensajeFinalAlert += mensajeWarning;
              }
  
              // Muestro el Mensaje de Finalizacion
              //alert(informacionPercepciones.mensajeOk);
              mensajeFinalAlert += informacionPercepciones.mensajeOk + "\n";
            } else {
              // Muestro el Error
              let erroresCalculoPercepciones = "";
              if (!isEmpty(informacionPercepciones.mensajeError) && informacionPercepciones.mensajeError.length == 1) {
                erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
              } else {
                for (let i = 0; !isEmpty(informacionPercepciones.mensajeError) && i < informacionPercepciones.mensajeError.length; i++) {
                  erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + "\n";
                }
              }
              //alert(erroresCalculoPercepciones);
              mensajeFinalAlert += erroresCalculoPercepciones;
            }
            if (informacionPercepciones.errorImpInt == false) {
              // Inicio Grabar Informacion del Impuesto Interno en la Transaccion
              if (!isEmpty(informacionPercepciones.infoImpuestoInterno) && informacionPercepciones.infoImpuestoInterno.length > 0) {
                // elimino las líneas de Impuesto Interno que estaban generadas en esta transacción
                for (let r = 0; r < objRecord.getLineCount("item"); r++) {
                  if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", r)) == true) {
                    /* nlapiSelectLineItem("item", r);
                                        nlapiRemoveLineItem("item");
                                        r--; */
                    let taxReferences = objRecord.getSublistValue("item", "taxdetailsreference", r);
                    deleteTaxDetailLine(objRecord, taxReferences);
                    objRecord.removeLine({ sublistId: "item", line: r });
                    r--;
                  }
                }
  
                for (let i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {
                  const indexFila = objRecord.getLineCount("item");
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "item", value: informacionPercepciones.infoImpuestoInterno[i].item });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoImpuestoInterno[i].cantidad });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoImpuestoInterno[i].importeUnitario });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_calculo", value: informacionPercepciones.infoImpuestoInterno[i].baseCalculo });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoImpuestoInterno[i].importeTotal });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_impuesto_interno", value: informacionPercepciones.infoImpuestoInterno[i].impuestoInterno });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoImpuestoInterno[i].importeImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0 });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00 });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00 });
  
                  // Si es una Orden de Venta cerrar la linea
                  if (objRecord.type == "salesorder") {
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "isclosed", value: true });
                  }
  
                }
  
              }
              // Fin Grabar Informacion del Impuesto Interno en la Transaccion
              // Informo Warnings
              if (informacionPercepciones.warningImpInt == true) {
                let mensajeWarningImpInt = "";
                for (let i = 0; !isEmpty(informacionPercepciones.mensajeWarningImpInt) && i < informacionPercepciones.mensajeWarningImpInt.length; i++) {
                  mensajeWarningImpInt += ((i + 1) + " - " + informacionPercepciones.mensajeWarningImpInt[i] + "\n");
                }
                //alert(mensajeWarningImpInt);
                mensajeFinalAlert += mensajeWarningImpInt;
              }
  
              // Muestro el Mensaje de Finalizacion
              //alert(informacionPercepciones.mensajeOkImpInt);
              mensajeFinalAlert += informacionPercepciones.mensajeOkImpInt + "\n";
            } else {
              // Muestro el Error
              let erroresCalculoImpInterno = "";
              if (!isEmpty(informacionPercepciones.mensajeErrorImpInt) && informacionPercepciones.mensajeErrorImpInt.length == 1) {
                erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
              } else {
                for (let i = 0; !isEmpty(informacionPercepciones.mensajeErrorImpInt) && i < informacionPercepciones.mensajeErrorImpInt.length; i++) {
                  erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + "\n";
                }
              }
              //alert(erroresCalculoImpInterno);
              mensajeFinalAlert += erroresCalculoImpInterno;
            }
            // Informar Mensaje General
            log.debug(proceso, mensajeFinalAlert);
          } else {
            log.error(proceso, "Error Obteniendo Información de Percepciones en VENTAS, el objeto informacionPercepciones no posee valor.");
          }
        } else {
          log.error(proceso, "Error Obteniendo Información de Percepciones en VENTAS, el objeto response no posee valor");
        }
        log.debug(proceso, "FIN callBackPercepciones - time: " + new Date());
        log.debug("objRecord.type",objRecord.type)
        if(objRecord.type == 'creditmemo'){
          validPer.validPercepciones(objRecord)
        }

        
      } catch (err) {
        log.error(proceso, "Error Calulando Percepción en VENTAS, Error : " + err.message);
      }
    }

    function getBooleanValue(objRecord, field) {

            let value = objRecord.getValue(field);

            if (value === true || value === "T") return "T";

            return "F";
    }

    function callBackPercepcionesIVA(response, objRecord) {
      const proceso = "callBackPercepcionesIVA";
      try {
  
        if (!isEmpty(response)) {
          const informacionPercepciones = JSON.parse(response.body)[0];
  
          const param_codigo_IVA = informacionPercepciones.codigo_IVA;
          //const taxTypeDetails = informacionPercepciones.taxType;
          if (!isEmpty(informacionPercepciones)) {
            let mensajeFinalAlert = "";
            
            //objRecord.setValue({ fieldId: "taxdetailsoverride", value: true });
            if (informacionPercepciones.error == false) {
              // Inicio Grabar Informacion de las Percepciones en la Transaccion
              if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
                // elimino las líneas de percepciones ventas que estaban generadas en esta transacción
                const numberOfItems = objRecord.getLineCount("item");
  
                for (let r = 0; r < numberOfItems; r++) {
                    if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_pv_creada", r)) == true && objRecord.getSublistValue("item", "custcol_l54_tipo_percepcion_vtas", r) == param_codigo_IVA) {
                      let taxReferences = objRecord.getSublistValue("item", "taxdetailsreference", r);
                      deleteTaxDetailLine(objRecord, taxReferences);
                      objRecord.removeLine({ sublistId: "item", line: r });
                    r--;
                  }
                }
  
                for (let i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {
  
                  //FDS1 chequueo la alicuota de percepción.
                  const porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));
  
                  if (!isEmpty(porcentajeAlicuota) && (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00)) { //FDS1: Solo inserto si es distinto de 0 la alicuota de percepción
  
                    const indexFila = objRecord.getLineCount("item");
  
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "item", value: informacionPercepciones.infoPercepciones[i].item });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "description", value: informacionPercepciones.infoPercepciones[i].descripcion });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoPercepciones[i].cantidad });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoPercepciones[i].importeUnitario });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoPercepciones[i].importeTotal });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoPercepciones[i].codigoImpuesto });
                   
                    // Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoPercepciones[i].porcentaje });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_jurisd_iibb_lineas", value: informacionPercepciones.infoPercepciones[i].jurisdiccion });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_pv_creada", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_es_percepcion", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
                    // Imp. Perc. redondeado a dos decimales
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    
                    // Imp. Perc. Original
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_percepcion_original", value: informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal });
  
                    // Diferencia por redondeo de Imp. Percepción
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_diferencia_redondeo", value: informacionPercepciones.infoPercepciones[i].diferenciaRedondeo });
  
                    // Base de cálculo redondeada
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_monto_imp_perc", value: informacionPercepciones.infoPercepciones[i].montoImponible });
  
                    // Base de cálculo original
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_calculo_original", value: informacionPercepciones.infoPercepciones[i].montoImponibleOriginal });
                    
                    // Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_coeficiente_base_imp", value: informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_imponible_original", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_monto_suj_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal });
                    //objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].importePercMonedaLocal });
                    //objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_cod_imp_sicore", value: informacionPercepciones.infoPercepciones[i].codigoImpuesoSicore });
                    //objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_cod_reg_sicore", value: informacionPercepciones.infoPercepciones[i].codigoRegimenSicore });
                    //objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_cod_cond_sicore", value: informacionPercepciones.infoPercepciones[i].codigoCondicionSicore });
                    
                    // Nuevo - Grabar Norma IIBB
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_norma_iibb_perc", value: informacionPercepciones.infoPercepciones[i].normaIIBB });
                    
                    // Nuevo - Grabar Tipo Contribuyente IIBB
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tipo_contribuyente", value: informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB });
  
                    // Nuevo - Grabar Campo Alicuota
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_alicuota", value: informacionPercepciones.infoPercepciones[i].porcentaje });
                    // Nuevo
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_impint_sin_desc", value: 0.00 });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_impuesto_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_net_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_total_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto });
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxdetailsreference", value: "iva" + i, ignoreFieldChange: true });
  
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tipo_percepcion_vtas", value: param_codigo_IVA });
                    
                    // segmentos de linea
                    /*if(!isEmpty(informacionPercepciones.segmentoUbicacion)){
                      objRecord.setSublistValue({ sublistId: "item", fieldId: "location", value: informacionPercepciones.segmentoUbicacion, ignoreFieldChange: true });
                    }*/
                    if(!isEmpty(informacionPercepciones.segmentoDepartamento)){
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "department", value: informacionPercepciones.segmentoDepartamento, ignoreFieldChange: true });
                    }
                    if(!isEmpty(informacionPercepciones.segmentoClase)){
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "class", value: informacionPercepciones.segmentoClase, ignoreFieldChange: true });
                    }
                    // Si es una Orden de Venta cerrar la linea
                    if (objRecord.type == "salesorder") {
                      objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "isclosed", value: true });
                    }
                    let lineCount = objRecord.getLineCount({ sublistId: "item" });
                    lineCount = lineCount - 1;
                    const sublistFieldTaxDetail = objRecord.getSublistValue({
                      sublistId: "item",
                      fieldId: "taxdetailsreference",
                      line: lineCount
                    });
                    log.debug(proceso, `TaxDetailRef: ${sublistFieldTaxDetail}`);
                    const objTaxDetailPercep = informacionPercepciones.infoPercepciones[i];
                    const textoDetails = "Percepciones IVA";
                    //var referenceDet = 'iva'+i;
                    objRecord = agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails);
                  }
                }
  
              }
              // Fin Grabar Informacion de las Percepciones en la Transaccion
              // Informo Warnings
              let mensajeWarning = "Aviso : \n ";
              if (informacionPercepciones.warning == true) {
                for (let j = 0; informacionPercepciones.mensajeWarning != null && j < informacionPercepciones.mensajeWarning.length; j++) {
                  mensajeWarning += ((j + 1) + " - " + informacionPercepciones.mensajeWarning[j] + "\n");
                }
                //alert(mensajeWarning);
                mensajeFinalAlert += mensajeWarning;
              }
  
              // Muestro el Mensaje de Finalizacion
              //alert(informacionPercepciones.mensajeOk);
              mensajeFinalAlert += informacionPercepciones.mensajeOk + "\n";
            } else {
              // Muestro el Error
              let erroresCalculoPercepciones = "";
              if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
                erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
              } else {
                for (let j = 0; informacionPercepciones.mensajeError != null && j < informacionPercepciones.mensajeError.length; j++) {
                  erroresCalculoPercepciones += informacionPercepciones.mensajeError[j] + "\n";
                }
              }
              //alert(erroresCalculoPercepciones);
              mensajeFinalAlert += erroresCalculoPercepciones;
            }
            if (informacionPercepciones.errorImpInt == false) {
              // Inicio Grabar Informacion del Impuesto Interno en la Transaccion
              if (informacionPercepciones.infoImpuestoInterno != null && informacionPercepciones.infoImpuestoInterno.length > 0) {
                // elimino las líneas de Impuesto Interno que estaban generadas en esta transacción
  
                for (let r = 0; r < objRecord.getLineCount("item"); r++) {
                  if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", r)) == true) {
                    let taxReferences = objRecord.getSublistValue("item", "taxdetailsreference", r);
                    deleteTaxDetailLine(objRecord, taxReferences);
                    objRecord.removeLine({ sublistId: "item", line: r });
                    r--;
                  }
                }
  
                for (let i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {
                  const indexFila = objRecord.getLineCount("item");
  
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "item", value: informacionPercepciones.infoImpuestoInterno[i].item });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoImpuestoInterno[i].cantidad });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoImpuestoInterno[i].importeUnitario });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_base_calculo", value: informacionPercepciones.infoImpuestoInterno[i].baseCalculo });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoImpuestoInterno[i].importeTotal });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_impuesto_interno", value: informacionPercepciones.infoImpuestoInterno[i].impuestoInterno });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoImpuestoInterno[i].importeImpuesto });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0 });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00 });
                  objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00 });
  
                  // Si es una Orden de Venta cerrar la linea
                  if (objRecord.type == "salesorder") {
                    objRecord.setSublistValue({ line: indexFila, sublistId: "item", fieldId: "isclosed", value: true });
                  }
  
                }
  
              }
              // Fin Grabar Informacion del Impuesto Interno en la Transaccion
              // Informo Warnings
              let mensajeWarningImpInt = "Aviso : \n ";
              if (informacionPercepciones.warningImpInt == true) {
                for (let i = 0; informacionPercepciones.mensajeWarningImpInt != null && i < informacionPercepciones.mensajeWarningImpInt.length; i++) {
                  mensajeWarningImpInt += ((i + 1) + " - " + informacionPercepciones.mensajeWarningImpInt[i] + "\n");
                }
                //alert(mensajeWarningImpInt);
                mensajeFinalAlert += mensajeWarningImpInt;
              }
  
              // Muestro el Mensaje de Finalizacion
              //alert(informacionPercepciones.mensajeOkImpInt);
              mensajeFinalAlert += informacionPercepciones.mensajeOkImpInt + "\n";
            } else {
              // Muestro el Error
              let erroresCalculoImpInterno = "";
              if (informacionPercepciones.mensajeErrorImpInt != null && informacionPercepciones.mensajeErrorImpInt.length == 1) {
                erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
              } else {
                for (let j = 0; informacionPercepciones.mensajeErrorImpInt != null && j < informacionPercepciones.mensajeErrorImpInt.length; j++) {
                  erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[j] + "\n";
                }
              }
              //alert(erroresCalculoImpInterno);
              mensajeFinalAlert += erroresCalculoImpInterno;
            }
            // Informar Mensaje General
            alert(mensajeFinalAlert);
          } else {
            alert("Error Obteniendo Informacion de Percepciones en VENTAS");
          }
        } else {
          alert("Error Obteniendo Informacion de Percepciones en VENTAS");
        }

        if(objRecord.type == 'creditmemo'){
          log.debug('Proceso de Percepciones Mejorado')
          validPer.validPercepciones(objRecord)
        }
      } catch (err) {
        alert("Error Calulando Percepcion en VENTAS , Error : " + err.message);
      }
    }

    function agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails) {
      log.debug("agregarTaxDetailsLine", `sublistFieldTaxDetail: ${sublistFieldTaxDetail} / objTaxDetailPercep: ${JSON.stringify(objTaxDetailPercep)} / taxTypeDetails: ${objTaxDetailPercep.taxType}`);
      //debugger;
      const indexFila = objRecord.getLineCount("taxdetails");
      log.debug("agregarTaxDetailsLine", "dentro del for taxdetails numberOfItems= " + indexFila);
      ////descripcion
      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxdetailsreference", value: sublistFieldTaxDetail, ignoreFieldChange: false, forceSyncSourcing: true });
      /* objRecord.setSublistValue({line: indexFila, sublistId:"taxdetails", fieldId: "linetype", value: 'Item'});
      objRecord.setSublistValue({line: indexFila, sublistId:"taxdetails", fieldId: "linename", value: objTaxDetailPercep.descripcion});
      objRecord.setSublistValue({line: indexFila, sublistId:"taxdetails", fieldId: "netamount", value: objTaxDetailPercep.montoImponible}); */


      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxtype", value: objTaxDetailPercep.taxType, ignoreFieldChange: false, forceSyncSourcing: true });

      log.audit("agregarTaxDetailsLine", `taxTypeDetails: ${objTaxDetailPercep.taxType} / objTaxDetailPercep.codigoImpuesto: ${objTaxDetailPercep.codigoImpuesto}`);

      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxcode", value: objTaxDetailPercep.codigoImpuesto });
      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxbasis", value: objTaxDetailPercep.montoImponibleOriginal });
      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxrate", value: objTaxDetailPercep.porcentaje });
      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "taxamount", value: objTaxDetailPercep.importeImpuesto });
      objRecord.setSublistValue({ line: indexFila, sublistId: "taxdetails", fieldId: "calcdetail", value: textoDetails });

      sleep(2000);
      return objRecord;
      //objRecord.commitLine({ sublistId: "taxdetails" });

    }


    function sleep(milliseconds) {
      const start = new Date().getTime();
      for (let i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
          break;
        }
      }
    }

    function deleteTaxDetailLine(objRecord, referenciaTaxDetail) {
      const objReturn = {};
      log.debug("deleteTaxDetailLine", "Entre a la funcion");
      const lineNumber = objRecord.findSublistLineWithValue({
        sublistId: "taxdetails",
        fieldId: "taxdetailsreference",
        value: referenciaTaxDetail
      });
      log.debug("deleteTaxDetailLine", "Line: " + lineNumber);
      if (lineNumber === -1) {
        // Not found
        return objReturn;
      } else {
        objRecord.removeLine({ sublistId: "taxdetails", line: lineNumber });
      }
    }

    function findTaxDetailLine(objRecord, referenciaTaxDetail) {
      const objReturn = {};
      const lineNumber = objRecord.findSublistLineWithValue({
        sublistId: "taxdetails",
        fieldId: "taxdetailsreference",
        value: referenciaTaxDetail
      });

      if (lineNumber === -1) {
        // Not found
        return objReturn;
      } else {
        objReturn.taxAmount = objRecord.getSublistValue("taxdetails", "taxamount", lineNumber);
        objReturn.netAmount = objRecord.getSublistValue("taxdetails", "taxbasis", lineNumber);
        objReturn.taxRate = objRecord.getSublistValue("taxdetails", "taxrate", lineNumber);
        objReturn.taxCode = objRecord.getSublistValue("taxdetails", "taxcode", lineNumber);
        objReturn.grossAmount = objReturn.taxAmount + objReturn.netAmount;
      }
      return objReturn;
    }

    function convertToBoolean(string) {
      return ((isEmpty(string) || string == "F" || string == false) ? false : true);
    }
  
      const Utils = {
        isEmpty(value) {
          return value === '' || value === null || value === undefined || 
                value === 'null' || value === 'undefined';
        },

        toBool(value) {
          if (value === "T" || value === true) return true;
          if (value === "F" || value === false) return false;
          return Boolean(value);
        },

        convertToBoolean(string) {
          return !this.isEmpty(string) && string !== "F" && string !== false;
        },

        logGovernance(script, location) {
          const usage = script.getRemainingUsage();
          if (usage < CONSTANTS.GOVERNANCE_THRESHOLD) {
            log.audit("Governance Warning", `Low usage at ${location}: ${usage}`);
          }
          return usage;
        },

        formatCurrency(amount, decimals = 2) {
          return parseFloat(parseFloat(amount || 0).toFixed(decimals));
        }
      };

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });