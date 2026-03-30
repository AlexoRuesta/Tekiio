/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
 define(
    [
      "L54/utilidades", "N/runtime", "N/ui/dialog", "N/currentRecord", "N/https", "N/url", "N/format", "N/record", "L54/ValidarPercepciones", "N/search"
    ],
    function (utilidades, runtime, dialog, currentRecord, https, url, format, record, validPer, search) {
      /*global define log */
      // migrado desde l54_proceso_pv_cliente.js
      function calcularPercepcionesVentas() {
  
        const proceso = "calcularPercepcionesVentas(cliente)";
  
        try {
          const currentScript = runtime.getCurrentScript();
          log.debug(proceso, "LINE 18 - Inicio de Cálculo de Percepciones Manual");
          log.audit("Governance Monitoring", "LINE 20 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());
          const objRecord = currentRecord.get();
          const letraDocumento = objRecord.getText("custbody_l54_letra");
          const idclienteTransaccion = objRecord.getValue("entity");
          log.debug(proceso, "LINE 24 - objRecord.isDynamic: " + objRecord.isDynamic + " - objRecord.type: " + objRecord.type + " - Letra documento: " + letraDocumento + " - idclienteTransaccion: " + idclienteTransaccion);
          let errorCargarCliente = false;
          var regCliente = null;
          var entityType = null; 
          try {
            /*var regCliente = record.load({
              type: record.Type.CUSTOMER,
              id: idclienteTransaccion
            });*/
            regCliente = search.lookupFields({
              type: record.Type.CUSTOMER,
              id: idclienteTransaccion,
              columns: ["custentity_l54_tipo_contribuyente_iibb"]
            });
            entityType = record.Type.CUSTOMER;
            log.debug(proceso, "LINE 32 - Es Cliente");
          } catch (errorCliente) {
            errorCargarCliente = true;
            log.error(proceso, "Error al intentar cargar Cliente - errorCliente:" + errorCliente.message);
          }
  
          if (errorCargarCliente) {
            try {
              /*regCliente = record.load({
                type: record.Type.JOB,
                id: idclienteTransaccion
              });*/
              regCliente = search.lookupFields({
                type: record.Type.JOB,
                id: idclienteTransaccion,
                columns: ["custentity_l54_tipo_contribuyente_iibb"]
            });
            entityType = record.Type.JOB;
              log.debug(proceso, "LINE 41 - Es Proyecto");
            } catch (errorJob) {
              log.error(proceso, "Error al intentar cargar Proyecto - errorJob:" + errorJob.message);
            }
          }
  
          //const idTipoContribIIBB = regCliente.getValue("custentity_l54_tipo_contribuyente_iibb");
          let idTipoContribIIBB = null;
          
          if (!isEmpty(regCliente.custentity_l54_tipo_contribuyente_iibb) && regCliente.custentity_l54_tipo_contribuyente_iibb.length > 0) {
            idTipoContribIIBB = regCliente.custentity_l54_tipo_contribuyente_iibb[0].value;
          }
          
          var auxexcepcionIVA = search.lookupFields({
            type: entityType,
            id: idclienteTransaccion,
            columns: ["custentity_l54_exencion_per_iva"]
          });
          // let calcularPercepcionesAux = "T";
          const difPermitida = 0.05;
          const totalRestaImportes = 0.00;
          //const excepcionIVA = convertToBoolean(regCliente.getValue("custentity_l54_exencion_per_iva"));
          const excepcionIVA = convertToBoolean(auxexcepcionIVA.custentity_l54_exencion_per_iva)
          console.log("excepcionIVA= " + excepcionIVA);
          var caducoExepcion;
          //var fechaCaducExcepIVA = regCliente.getValue('custentity_l54_exencion_fec_cad');
          var auxfechaCaducExcepIVA = search.lookupFields({
            type: entityType,
            id: idclienteTransaccion,
            columns: ["custentity_l54_exencion_fec_cad"]
        });
          var fechaCaducExcepIVA = auxfechaCaducExcepIVA.custentity_l54_exencion_fec_cad;
          
          var fechaActual = objRecord.getValue('trandate');
          if(!isEmpty(fechaCaducExcepIVA)){
            if(fechaActual < fechaCaducExcepIVA){
              caducoExepcion = false;
              //alert('Aun no caduca la Exepcion');
            } else if(fechaActual > fechaCaducExcepIVA){
              caducoExepcion = true;
              //alert('La Exepcion Caduco');
            } else{
              caducoExepcion = false;
              //alert('La fecha es igual');
            }
              }
          if (isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion))){ 
            alert("No se puede continuar el proceso de cálculo de percepciones de IIBB porque no tiene configurado Tipo Contribuyente IIBB en el registro del cliente. Por favor, verifique/edite el registro y vuelva a intentar.");
            alert("No se puede continuar el proceso de cálculo de percepciones de IVA porque la configuración de inscripción de IVA en el cliente no lo permite. Por favor, verifique/edite el registro y vuelva a intentar.");
          } else {
            
            var llevaPercepcion = false;
            var nameTipoContribIIBB = null;
  
            if (!isEmpty(idTipoContribIIBB)) {
              var regTipoContribIIBB = record.load({
                type: "customrecord_l54_tipo_contribuyente_iibb",
                id: idTipoContribIIBB
              });
              nameTipoContribIIBB = regTipoContribIIBB.getValue("name");
              llevaPercepcion = regTipoContribIIBB.getValue("custrecord_l54_calcula_percepcion");
            }
  
            log.debug(proceso, "LINE 65 - nameTipoContribIIBB: " + nameTipoContribIIBB + " - calcula percepcion según el tipo de contribuyente (llevaPercepcion): " + llevaPercepcion + ". IMPORTANTE: Si \"llevaPercepcion\" es F, no calcula percepciones.");
            
            if(!llevaPercepcion && !isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion))){
            
              alert("No se calcula percepción IIBB debido a que el Cliente Pertenece al Tipo de Contribuyente : " + nameTipoContribIIBB + ", el cual está configurado para que no calcule percepciones.");
              alert("No se puede continuar el proceso de cálculo de percepciones de IVA porque la configuración de inscripción de IVA en el cliente no lo permite. Por favor, verifique/edite el registro y vuelva a intentar.");

            } else {
              if (letraDocumento == "E") {
                alert("Las facturas de letra E no aplican al cálculo de percepciones.");
              } else {
                if (confirm("El proceso de cálculo de percepciones en ventas puede demorar unos segundos, ¿desea continuar?")) {

                  if (isEmpty(idTipoContribIIBB)) {
                    alert("No se puede realizará el proceso de cálculo de percepciones de IIBB porque no tiene configurado Tipo Contribuyente IIBB en el registro del cliente. Por favor, verifique/edite el registro y vuelva a intentar.");
                  }

                  if (objRecord.getLineCount("item") == 0) {
                    alert("No se procederá a calcular percepción, ya que no existen Ítems.");
                    return false;
                  }
                  if (objRecord.getLineCount("taxdetails") == 0) {
                    alert("No se ha configurado TaxDetails. Por favor use el botón 'Preview Tax' para generar los TaxDetails correspondientes.");
                    return false;
                  }
                  let total = parseFloat(objRecord.getValue("total"), 10);
                  let total_aux = total;
                  log.debug(proceso, "LINE 77 - Total inicial: " + total);
                  let totalDiscount = 0;
                  objRecord.setValue({ fieldId: "taxdetailsoverride", value: true });
                  for (let r = 0; r < objRecord.getLineCount("item"); r++) {
                    var tipoItem = objRecord.getSublistValue("item", "itemtype", r);
                    const amountItem = objRecord.getSublistValue("item", "amount", r);
                    var esPercepcion = objRecord.getSublistValue("item", "custcol_l54_pv_creada", r);
                    const esImpuestoInterno = objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", r);
  
                    totalDiscount += (!isEmpty(tipoItem) && tipoItem == "Discount") ? Math.abs(parseFloat(amountItem, 10)) : 0;
  
                    log.debug(proceso, "tipoItem: " + tipoItem + " - amountItem: " + amountItem + " - esPercepcion: " + esPercepcion + " - esImpuestoInterno: " + esImpuestoInterno);
  
                    if (esPercepcion == "T" || esPercepcion == true || esImpuestoInterno == "T" || esImpuestoInterno == true) {
  
                      if (esImpuestoInterno != "T" && esImpuestoInterno != true) {
                        //Se restan las percepciones al total de la factura para sacar el total sin percepciones
                        total -= parseFloat(objRecord.getSublistValue("item", "taxamount", r), 10);
                      }
  
                      total_aux -= parseFloat(objRecord.getSublistValue("item", "taxamount", r), 10);
  
                      /* var lineNum = objRecord.selectLine({ sublistId: 'item', line: r });
                                                                       objRecord.removeLine({ sublistId: 'item', line: lineNum }); */
                      objRecord.selectLine({ sublistId: "item", line: r });
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                  }
  
                  /* INICIO - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */
  
                  var cantidadAcumulados = objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc");
                  log.debug('calcularPercepciones', 'LINE 194 - CANTIDAD ACUMULADOS: ' + cantidadAcumulados);
  
                  for (var j = 0; j < objRecord.getLineCount("recmachcustrecord_l54_acum_perc_trans_asoc"); j++) {
                    objRecord.selectLine({ sublistId: "item", line: j});
                     objRecord.removeLine({
                              sublistId: 'recmachcustrecord_l54_acum_perc_trans_asoc',
                              line: j
                          })
                      j--;
                  }
  
                  /* FIN - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */
  
                  let tipoCambio = parseFloat(objRecord.getValue("exchangerate"), 10);
                  //Valor del total sin percepciones en moneda local
                  const total_moneda_local = parseFloat(parseFloat(total, 10) * parseFloat(tipoCambio, 10), 10);
                  log.debug(proceso, "TipoCambio Transaccion: " + tipoCambio + " - Total Transaccion (Sin Percepciones): " + total_aux + " - Total Transaccion Monena Local (Sin Percepciones): " + total_moneda_local + " - Total Transaccion Monena Local (Sin Percepciones).toFixed(2): " + (total_moneda_local).toFixed(2) + " - TipoTransaccion: " + objRecord.type + " - Discount: " + totalDiscount);
                  // calcularPercepcionesAux = "T"; // no cambia nunca, asi esta en prod. 24/4/2023, proceso migracion script reingeneria argentina}
  
  
                  // Obtengo informacion de la Transaccion
                  const subTotal = objRecord.getValue("subtotal");
                  const discounttotal = objRecord.getValue("discounttotal");
                  tipoCambio = objRecord.getValue("exchangerate");
                  let subsidiariaTransaccion = null;
                  const esOneWorld = utilidades.l54esOneworld();
                  subsidiariaTransaccion = esOneWorld ? objRecord.getValue("subsidiary") : null;
                  const subsidiariaText = esOneWorld ? objRecord.getText("subsidiary") : "";
                  // ! En suitetax el costo de envio no se maneja bien, netsuite no lo soporta correctamente, asi que va en 0.
                  // const costoEnvio = !isEmpty(objRecord.getValue("shippingcost")) ? objRecord.getValue("shippingcost") : 0;
                  const costoEnvio = 0;
                 
                  const tipoContribuyente = objRecord.getValue("custbody_l54_tipo_contribuyente");
                  
                  // Inicio Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
                  const informacionTransaccion = {};
                  const trandate = objRecord.getValue("trandate");
                  log.debug(proceso, "LINE 167 - Trandate antes de parsear: " + trandate);
                  const periodo = objRecord.getValue("postingperiod");
                  informacionTransaccion.periodo = periodo;
                  informacionTransaccion.trandate = format.parse({
                    value: trandate,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                  });
                                    log.debug(proceso, "line 174 - Trandate: " + informacionTransaccion.trandate);
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
                  log.debug(proceso, "LINE 183 - llevaPercepcion:  " + llevaPercepcion);
  
                  // INICIO Nuevo - Considerar Jurisdiccion de Entrega
                  const coeficienteBaseImponible = objRecord.getValue("custbody_l54_coeficiente_base_imp");
                 
                  informacionTransaccion.coeficienteBaseImponible = isEmpty(objRecord.getValue("custbody_l54_coeficiente_base_imp")) ? 1.00 : objRecord.getValue("custbody_l54_coeficiente_base_imp");
                  
                  informacionTransaccion.tipoContribuyente = tipoContribuyente;
                  informacionTransaccion.totalDiscount = totalDiscount;
  
                  // FIN Nuevo - Considerar Jurisdiccion de Entrega
  
                  informacionTransaccion.articulos = new Array();
  
                  // INICIO Informacion Para Impuestos Internos
                  informacionTransaccion.informacionImpInterno = new Object();
                  informacionTransaccion.informacionImpInterno.calcularImp = false;
                  informacionTransaccion.informacionImpInterno.montoImpInterno = parseFloat(0, 10);
                  informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(0, 10);
                  informacionTransaccion.informacion_articulos_iva = new Array();
  
                  // FIN Informacion Para Impuestos Internos

                  //INICIO Informacion para Linea Obligatorias
                  let obligCampos = getConfCamposObligatorios(informacionTransaccion.subsidiaria,informacionTransaccion.trantype);
                  console.log('obligCampos: '+ JSON.stringify(obligCampos))
                  informacionTransaccion.obligCampos = obligCampos;
                  //FIN Informacion para Linea Obligatorias
  
                  // INICIO NUEVO enviar informacion de si se debe calcular las percepciones o no
                  informacionTransaccion.letra = letraDocumento;
                  informacionTransaccion.nameTipoContribIIBB = nameTipoContribIIBB;
                  informacionTransaccion.llevaPercepcion = llevaPercepcion;
                  informacionTransaccion.calcularPercepciones = false;
                  informacionTransaccion.calcularPercepcionesIVA = false;
                  
                  if ((letraDocumento!='E' && llevaPercepcion)){
                     // se entra por validacion de ingresos brutos
                    informacionTransaccion.calcularPercepciones = true;
                  }
  
                  if (excepcionIVA == false || (excepcionIVA && caducoExepcion)) {
                    informacionTransaccion.calcularPercepcionesIVA = true;
                  }

                  // FIN NUEVO enviar informacion de si se debe calcular las percepciones o no
                  log.debug(proceso, "letraDocumento: " + letraDocumento + " - llevaPercepcion: " + llevaPercepcion);
                  log.debug(proceso, "informacionTransaccion.calcularPercepciones: " + informacionTransaccion.calcularPercepciones + ' / informacionTransaccion.calcularPercepcionesIVA: ' + informacionTransaccion.calcularPercepcionesIVA);
  
                  // Inicio Obtener Informacion de los Articulos
                  let contadorArticulos = 0;
                  const numberOfItems = objRecord.getLineCount("item");
                  log.debug(proceso, "LINE 218 numberOfItems: " + numberOfItems);
  
                  for (let i = 0; i < numberOfItems; i++) {
  
                    const item = objRecord.getSublistValue("item", "item", i);
                    const cantidad = objRecord.getSublistValue("item", "quantity", i);
  
                    tipoItem = objRecord.getSublistValue("item", "itemtype", i);
  
                    let itemBienDeUso = objRecord.getSublistValue("item", "custcol_l54_pv_bien_de_uso", i);
                    log.debug(proceso, "itemBienDeUso: " + itemBienDeUso);
                    itemBienDeUso = (!isEmpty(itemBienDeUso) && (itemBienDeUso == true || itemBienDeUso == "T"));
  
                    let otrosTributos = objRecord.getSublistValue("item", "custcol_l54_otros_tributos", i);
                    log.debug(proceso, "otrosTributos: " + otrosTributos);
                    otrosTributos = (!isEmpty(otrosTributos) && (otrosTributos == true || otrosTributos == "T"));
  
                    let impuestoInterno = objRecord.getSublistValue("item", "custcol_l54_impuesto_interno", i);
                    log.debug(proceso, "impuestoInterno: " + impuestoInterno);
                    impuestoInterno = (!isEmpty(impuestoInterno) && (impuestoInterno == true || impuestoInterno == "T"));
  
                    esPercepcion = objRecord.getSublistValue("item", "custcol_l54_pv_creada", i);
                    log.debug(proceso, "esPercepcion: " + esPercepcion);
                    esPercepcion = (!isEmpty(esPercepcion) && (esPercepcion == true || esPercepcion == "T"));
  
  
                    const tipoProducto = objRecord.getSublistValue("item", "custcol_l54_tipo_producto", i);
                    const referenciaTaxDetail = objRecord.getSublistValue("item", "taxdetailsreference", i);
                    const objectTaxDetails = findTaxDetailLine(objRecord, referenciaTaxDetail);
                    const codigoImpuesto = objectTaxDetails.taxCode;
                    const importeImpuestoIVA = objectTaxDetails.taxAmount;
                    const importeBrutoItem = objectTaxDetails.grossAmount;
                    const itemImporte = objectTaxDetails.netAmount;
  
                    // Los Items de Descuento tenerlos en Cuenta
                    if (itemBienDeUso == false && !isEmpty(itemImporte) && (tipoItem == 'Discount' || (!isEmpty(cantidad) && cantidad > 0)) && otrosTributos == false && impuestoInterno == false && esPercepcion == false){
                      
                      if (tipoItem != 'Discount' && tipoItem != 'Description' && tipoItem != 'Subtotal') {
                        informacionTransaccion.articulos[contadorArticulos] = new Object();
                        informacionTransaccion.articulos[contadorArticulos] = obtenerDatosLineas(objRecord, item, itemImporte, importeBrutoItem,obligCampos,  i);
                      } else if (tipoItem == 'Discount') {
                        informacionTransaccion.articulos[contadorArticulos - 1].importeBrutoLinea += parseFloat(importeBrutoItem, 10);
                        informacionTransaccion.articulos[contadorArticulos - 1].importeNetoLinea += parseFloat(itemImporte, 10);
                      }
                      
                      contadorArticulos = parseInt(contadorArticulos, 10) + parseInt(1, 10);
  
                      // INICIO Enviar Información Para CAclular Impuesto Interno
                      if (tipoItem != "Discount") {
                        const porcentajeImpuestoInterno = objRecord.getSublistValue("item", "custcol_3k_porc_imp_interno", i);
                        if (!isEmpty(porcentajeImpuestoInterno) && !isNaN(parseFloat(porcentajeImpuestoInterno, 10)) && parseFloat(porcentajeImpuestoInterno, 10) > 0) {
                          informacionTransaccion.informacionImpInterno.calcularImp = true;
                          informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(informacionTransaccion.informacionImpInterno.baseCalculo, 10) + parseFloat(itemImporte, 10);
                          informacionTransaccion.informacionImpInterno.montoImpInterno = parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno, 10) + parseFloat((parseFloat(porcentajeImpuestoInterno, 10) * parseFloat(itemImporte, 10) / 100), 10);
                        }
  
                      }
                      if (informacionTransaccion.calcularPercepcionesIVA) {
                        const objectIVA = new Object();
                        objectIVA.tipoProducto = tipoProducto;
                        objectIVA.tipoIVA = codigoImpuesto;
                        objectIVA.baseNetaImponible = parseFloat(itemImporte, 10);
                        objectIVA.baseImporteBruto = parseFloat(importeBrutoItem, 10);
                        objectIVA.baseImporteIVA = parseFloat(importeImpuestoIVA, 10);
                        console.log("tipoProducto= " + tipoProducto + " tipoIVA " + codigoImpuesto);
                        const index = informacionTransaccion.informacion_articulos_iva.findIndex(function (obj) {
                          return obj.tipoProducto == tipoProducto && obj.tipoIVA == codigoImpuesto;
                        });
                        if (index >= 0) {
                          informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible, 10) + parseFloat(itemImporte, 10);
                          informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto, 10) + parseFloat(importeBrutoItem, 10);
                          informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA, 10) + parseFloat(importeImpuestoIVA, 10);
                        } else {
                          informacionTransaccion.informacion_articulos_iva.push(objectIVA);
                        }
                      }
                      // FIN Enviar Información Para CAclular Impuesto Interno
                    }
  
                  }
                  // Fin Obtener Informacion de los Articulos                  
                  if (!isEmpty(numberOfItems) && numberOfItems > 0 && !isEmpty(contadorArticulos) && contadorArticulos > 0) {
  
                    // var objInformacionTransaccion = new Array();
                    const objInformacionTransaccion = {};
                    const informacionTransaccionJson = JSON.stringify(informacionTransaccion);
                    objInformacionTransaccion.informacionTransaccion = informacionTransaccionJson;
  
                    if (informacionTransaccion.calcularPercepciones) {
                    try {
                      log.debug(proceso, "INICIO llamada SuiteLet");
                      log.debug(proceso, "Parametros Suitelet: " + informacionTransaccionJson);
                      log.audit("Governance Monitoring", "LINE 284 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());
                      const new_url = url.resolveScript({
                        scriptId: "customscript_l54_calcular_percep_ventas",
                        deploymentId: "customdeploy_l54_calcular_percep_ventas"
                      });
  
                      const response = https.post({
                        url: new_url,
                        body: objInformacionTransaccion,
                      });
  
                      callBackPercepciones(response, objRecord);
  
                      log.audit("Governance Monitoring", "LINE 306 - Remaining Usage = " + currentScript.getRemainingUsage() + " --- time: " + new Date());
                      log.debug(proceso, "FIN llamada SuiteLet");
                    } catch (err) {
                      log.error(proceso, "LINE 329 - Error Calculando Percepiones en Ventas - NetSuite error: " + JSON.stringify(err));
                      console.log(err);
                      return true;
                      }
                    }
  
  
                    log.debug(proceso, `LINE 353 - cantidad de lineas de articulos: ${objRecord.getLineCount("item")}`);
  
                    // Fin Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
                    if (informacionTransaccion.calcularPercepcionesIVA) {
                      alert("Se inicia el proceso de calculo de Percepciones IVA espere un momento");
                      try {
                        log.debug("calcular_percepciones_ventas_IVA", "INICIO llamada SuiteLet IVA");
                        log.debug("calcular_percepciones_ventas_IVA", "Parametros Suitelet IVA: " + informacionTransaccionJson);
                        // const strURLIVA = nlapiResolveURL("SUITELET", "customscript_l54_cal_percep_ventas_iva", "customdeploy_l54_cal_percep_ventas_iva");
                        // const objRtaIVA = nlapiRequestURL(strURLIVA, objInformacionTransaccion, null, callBackPercepcionesIVA, null);
  
                        const new_url = url.resolveScript({
                          scriptId: "customscript_l54_cal_percep_ventas_iva2",
                          deploymentId: "customdeploy_l54_cal_percep_ventas_iva2"
                        });
  
                        const response = https.post({
                          url: new_url,
                          body: objInformacionTransaccion
                        });
  
                        callBackPercepcionesIVA(response, objRecord);
  
                        log.debug("calcular_percepciones_ventas", "IVA FIN llamada SuiteLet");
                      } catch (err) {
                        log.error("calcular_percepciones_ventas", "IVA LINE 329 - Error Calculando Percepiones en Ventas - NetSuite error: " + JSON.stringify(err));
                        return true;
                      }
                    } else {
                      alert("No se puede realizar el proceso de cálculo de percepciones de IVA porque la configuración de inscripción de IVA en el cliente no lo permite. Por favor, verifique/edite el registro y vuelva a intentar.");
                    }
                  } else {
                    // Si no Hay Articulos Para Calcular Percepciones en VENTAS
                    if (isEmpty(numberOfItems) || (!isEmpty(numberOfItems) && numberOfItems == 0)) {
                      alert("No se ingresaron Articulos en la Transaccion");
                      return true;
                    } else {
                      alert("Los Articulos Ingresados en la Transaccion No generan Percepciones");
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
          alert("Error - Proceso cálculo de percepciones: " + err.message);
          log.debug(proceso, "LINE 349- Exception error NC Parciales:" + err.message);
        }
      }
  
      function obtenerDatosLineas(objRecord, item, itemImporte, importeBrutoLinea,obligCampos, numberLine) {
      
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

        /********************************* CAMPOS OBLIGATORIOS DE LINEA *****************************/
        if(!isEmpty(obligCampos) && obligCampos != {} ){
          if(obligCampos.llenadoPrimerLista && !obligCampos.procesado){
            for(var i = 0 ; i< (obligCampos.campos).length; i++){
              obligCampos.campos[i].value = objRecord.getSublistValue('item', obligCampos.campos[i].fieldId,numberLine);
            }
            obligCampos.procesado = true;
          }
        }


        /********************************* CAMPOS OBLIGATORIOS DE LINEA *****************************/


      
        return datosLinea;
      }
  
      function alert_msg(bodyMessage) {
        dialog.alert({
          title: "Mensaje",
          message: bodyMessage
        }).then(function (result) {
          console.log("Success with value " + result);
        }).catch(function (reason) {
          console.log("Failure: " + reason);
        });
      }
  
      function isEmpty(value) {
        return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
      }
  
      function getInfoTransReferencia(transaccion_referencia) {
  
        const proceso = "getInfoTransReferencia(cliente)";
        const response = { error: false, mensaje: "", datosReferencia: "" };
  
        try {
          log.debug(proceso, "transaccion_referencia: " + transaccion_referencia);
  
          if (!isEmpty(transaccion_referencia)) {
            const filtros = [];
            const filtro1 = {
              name: "internalid",
              operator: "IS",
              values: transaccion_referencia
            };
  
            filtros.push(filtro1);
            const objResultSet = utilidades.searchSavedPro("customsearch_l54_imp_transaccion_ref", filtros);
  
            if (!objResultSet.error) {
              const resultSet = objResultSet.objRsponseFunction.result;
              const resultSearch = objResultSet.objRsponseFunction.search;
  
              if (!isEmpty(resultSet) && resultSet.length > 0) {
                response.datosReferencia.idTransRef = resultSet.getValue({ name: resultSearch.columns[0] }); //Get internalid
                response.datosReferencia.totalTransRef = resultSet.getValue({ name: resultSearch.columns[1] }); //Get Total Transacción Referencia
                response.datosReferencia.recordTypeTransRef = resultSet.getValue({ name: resultSearch.columns[2] }); // Tipo de registro del tipo de transacción
                response.datosReferencia.referenciaOfTransRef = resultSet.getValue({ name: resultSearch.columns[3] }); // Referencia de la transacción de referencia
              } else {
                response.error = true;
                response.mensaje = "No se encontró ningún resultado de transacción de referencia para la transacción con ID: " + transaccion_referencia;
                log.error(proceso, response.mensaje);
              }
            } else {
              response.error = true;
              response.mensaje = "Error intentando obtener información del SS: \"L54 -Importe sin Perc. de Transacción Referencia\" - Detalles: " + objResultSet.descripcion;
              log.error(proceso, response.mensaje);
            }
          }
        } catch (error) {
          response.error = true;
          log.error(proceso, "LINE 482 - Error NetSuite Excepción - Detalles: " + error.message);
        }
        log.debug(proceso, "response: " + JSON.stringify(response));
        return response;
      }
  
      function agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails) {
        log.debug("agregarTaxDetailsLine", `sublistFieldTaxDetail: ${sublistFieldTaxDetail} / objTaxDetailPercep: ${JSON.stringify(objTaxDetailPercep)} `);
        objRecord.selectNewLine({ sublistId: "taxdetails" });
        ////descripcion
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxdetailsreference", value: sublistFieldTaxDetail, ignoreFieldChange: false, forceSyncSourcing: true });
        /* objRecord.setCurrentSublistValue({sublistId:"taxdetails", fieldId: "linetype", value: 'Item'});
        objRecord.setCurrentSublistValue({sublistId:"taxdetails", fieldId: "linename", value: objTaxDetailPercep.descripcion});
        objRecord.setCurrentSublistValue({sublistId:"taxdetails", fieldId: "netamount", value: objTaxDetailPercep.montoImponible}); */
  
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxtype", value: objTaxDetailPercep.taxType, ignoreFieldChange: false, forceSyncSourcing: true });
  
        log.audit("agregarTaxDetailsLine", `taxTypeDetails: ${objTaxDetailPercep.taxType} / objTaxDetailPercep.codigoImpuesto: ${objTaxDetailPercep.codigoImpuesto}`);
  
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxcode", value: objTaxDetailPercep.codigoImpuesto });
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxbasis", value: objTaxDetailPercep.montoImponibleOriginal });
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxrate", value: objTaxDetailPercep.porcentaje });
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "taxamount", value: objTaxDetailPercep.importeImpuesto });
        objRecord.setCurrentSublistValue({ sublistId: "taxdetails", fieldId: "calcdetail", value: textoDetails });
        // sleep(5000);
        objRecord.commitLine({ sublistId: "taxdetails" });
  
      }
  
      function sleep(milliseconds) {
        const start = new Date().getTime();
        for (let i = 0; i < 1e7; i++) {
          if ((new Date().getTime() - start) > milliseconds) {
            break;
          }
        }
      }
  
      function findTaxDetailLine(objRecord, referenciaTaxDetail) {
        const objReturn = {};
        log.debug("findTaxDetailLine", "Entre a la funcion");
        const lineNumber = objRecord.findSublistLineWithValue({
          sublistId: "taxdetails",
          fieldId: "taxdetailsreference",
          value: referenciaTaxDetail
        });
        log.debug("findTaxDetailLine", "Line: " + lineNumber);
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
        log.debug("findTaxDetailLine", "483 - objReturn: " + JSON.stringify(objReturn));
        return objReturn;
      }
  
      function callBackPercepciones(response, objRecord) {
  
        const proceso = "callBackPercepciones(cliente)";
  
        try {
          log.debug(proceso, "INICIO callBackPercepciones - time: " + new Date());
          if (!isEmpty(response)) {
            const informacionPercepciones = JSON.parse(response.body)[0];
            const param_codigo_IVA = informacionPercepciones.codigo_IVA;
            //const taxTypeDetails = informacionPercepciones.taxType;
            if (!isEmpty(informacionPercepciones)) {
              const locationRec = objRecord.getValue("location");
  
              let mensajeFinalAlert = "";
              if (informacionPercepciones.error == false) {
                // Inicio Grabar Informacion de las Percepciones en la Transaccion
                var fecha = objRecord.getValue('trandate');
                if (!isEmpty(informacionPercepciones.detalleAcumulados) && informacionPercepciones.detalleAcumulados.length > 0) {
                  for (var i = 0; i < informacionPercepciones.detalleAcumulados.length; i++) {
                    log.debug('calcularPercepciones', 'linea i: ' + i + ' / detalleAcumulados : ' + JSON.stringify(informacionPercepciones.detalleAcumulados[i]));
                    
                      objRecord.selectNewLine({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc" });
              
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_cliente", value: informacionPercepciones.detalleAcumulados[i].cliente });
                      if(!isEmpty(informacionPercepciones.detalleAcumulados[i].periodo)){
                        objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_periodo", value: informacionPercepciones.detalleAcumulados[i].periodo });
                      }
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_subsidiaria", value: informacionPercepciones.detalleAcumulados[i].subsidiaria });
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_base_calculo", value: informacionPercepciones.detalleAcumulados[i].baseCalculo});
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_jurisdiccion", value: informacionPercepciones.detalleAcumulados[i].jurisdiccion });
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_per_tipo_cambio", value: informacionPercepciones.detalleAcumulados[i].tipoCambio });
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_fecha", value:fecha });
                      objRecord.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc", fieldId: "custrecord_l54_acum_perc_anulado", value: false });
                      
                      objRecord.commitLine({ sublistId: "recmachcustrecord_l54_acum_perc_trans_asoc" });
                    }
                }
                //FIN - REGISTRO DE ACUMULADOS RETENCION IIBB
  
                if (!isEmpty(informacionPercepciones.infoPercepciones) && informacionPercepciones.infoPercepciones.length > 0) {
                  // elimino las líneas de percepciones ventas que estaban generadas en esta transacción
                  const numberOfItems = objRecord.getLineCount("item");
                  
                  for (let r = 0; r < numberOfItems; r++) {
                    if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_pv_creada", r)) == true && objRecord.getSublistValue("item", "custcol_l54_tipo_percepcion_vtas", r) != param_codigo_IVA) {
                      /* var lineNum = objRecord.selectLine({ sublistId: 'item', line: r });
                      objRecord.removeLine({ sublistId: 'item', line: lineNum }); */
  
                      objRecord.selectLine({ sublistId: "item", line: r });
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                  }
  
                  for (let i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {
  
                    log.debug(proceso, `nro de items en cada iteracion: ${objRecord.getLineCount("item")}`);
  
                    const porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));
  
                    if (!isEmpty(porcentajeAlicuota) && (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00)) {
  
                      objRecord.selectNewLine({ sublistId: "item" });
              
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "item", value: informacionPercepciones.infoPercepciones[i].item, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "description", value: informacionPercepciones.infoPercepciones[i].descripcion });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoPercepciones[i].cantidad, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoPercepciones[i].importeUnitario, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoPercepciones[i].importeTotal, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoPercepciones[i].codigoImpuesto, ignoreFieldChange: true });
  
  
                      // Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoPercepciones[i].porcentaje, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisd_iibb_lineas", value: informacionPercepciones.infoPercepciones[i].jurisdiccion, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_pv_creada", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_es_percepcion", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
  
                      // Imp. Perc. redondeado a dos decimales
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: false });// ! dejar false
  
                      // Imp. Perc. Original
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_percepcion_original", value: informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, ignoreFieldChange: false });
  
                      // Diferencia por redondeo de Imp. Percepción
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_diferencia_redondeo", value: informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, ignoreFieldChange: true });
  
                      // Base de cálculo redondeada
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_monto_imp_perc", value: informacionPercepciones.infoPercepciones[i].montoImponible, ignoreFieldChange: true });
  
                      // Base de cálculo original
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_calculo_original", value: informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_coeficiente_base_imp", value: informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_imponible_original", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_monto_suj_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_importe_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].importePercMonedaLocal, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Norma IIBB
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_norma_iibb_perc", value: informacionPercepciones.infoPercepciones[i].normaIIBB, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Tipo Contribuyente IIBB
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tipo_contribuyente", value: informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Campo Alicuota
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_alicuota", value: informacionPercepciones.infoPercepciones[i].porcentaje, ignoreFieldChange: true });
                      // NUEVO
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_impint_sin_desc", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_impuesto_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_net_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_total_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxdetailsreference", value: "iibb" + i, ignoreFieldChange: false });
  
                      // segmentos de linea
                      /*if(!isEmpty(informacionPercepciones.segmentoUbicacion)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "location", value: informacionPercepciones.segmentoUbicacion, ignoreFieldChange: true });
                      }
                      if(!isEmpty(informacionPercepciones.segmentoDepartamento)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "department", value: informacionPercepciones.segmentoDepartamento, ignoreFieldChange: true });
                      }
                      if(!isEmpty(informacionPercepciones.segmentoClase)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "class", value: informacionPercepciones.segmentoClase, ignoreFieldChange: true });
                      }
                      */
                      console.log('informacionPercepciones.camposOblig: ' + JSON.stringify(informacionPercepciones.obligCampos))
                      if(!isEmpty(informacionPercepciones.obligCampos) && informacionPercepciones.obligCampos != {} ){
                        var camposList = informacionPercepciones.obligCampos.campos;
                        if(camposList){
                          for (var ii=0; ii<camposList.length ; ii++){
                            var value = informacionPercepciones.obligCampos.campos[ii].value;
                            var fieldId = informacionPercepciones.obligCampos.campos[ii].fieldId;
                            objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: fieldId, value: value, ignoreFieldChange: true })
                          }
                        }
                      }
                      // Seteo de campo nuevos de columnas de jurisdicciones
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisdiccion_fact_ventas", value: '', ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisdiccion_util_ventas", value: '', ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisdiccion_desti_ventas", value: '', ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisdiccion_origen_vtas", value: '', ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisdiccion_empresa_vtas", value: '', ignoreFieldChange: true });
                      // Si es una Orden de Venta cerrar la linea
                      log.debug(proceso, "LINE 464 - objRecord.type: " + objRecord.type);
                      if (objRecord.type == "salesorder") {
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "isclosed", value: true, ignoreFieldChange: true });
                      }
                      log.debug(proceso, "LINE 578 - flag: ");
                      objRecord.commitLine({ sublistId: "item" });
  
                      log.debug(proceso, "LINE 581 - flag: ");
                      let lineCount = objRecord.getLineCount({ sublistId: "item" });
                      const textoDetails = informacionPercepciones.infoPercepciones[i].descripcion;
                      lineCount = lineCount - 1;
                      const sublistFieldTaxDetail = objRecord.getSublistValue({
                        sublistId: "item",
                        fieldId: "taxdetailsreference",
                        line: lineCount
                      });
                      log.debug(proceso, `TaxDetailRef: ${sublistFieldTaxDetail}`);
                      const objTaxDetailPercep = informacionPercepciones.infoPercepciones[i];
                      //var referenceDet = 'iibb'+i;
                      agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails);
                    }
                  }
                  
      
                }
                // Fin Grabar Informacion de las Percepciones en la Transaccion
                // Informo Warnings
                var mensajeWarning = "Aviso : \n ";
                if (informacionPercepciones.warning == true) {
                  for (let i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++) {
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
                if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
                  erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
                } else {
                  for (let i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++) {
                    erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + "\n";
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
                      /* nlapiSelectLineItem("item", r);
                                                                                  nlapiRemoveLineItem("item");
                                                                                  r--; */
  
                      objRecord.selectLine({ sublistId: "item", line: r });
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                  }
  
                  for (let i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {
                    objRecord.selectNewLine({ sublistId: "item" });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "item", value: informacionPercepciones.infoImpuestoInterno[i].item, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoImpuestoInterno[i].cantidad, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoImpuestoInterno[i].importeUnitario, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_calculo", value: informacionPercepciones.infoImpuestoInterno[i].baseCalculo, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoImpuestoInterno[i].importeTotal, ignoreFieldChange: false }); // ! este falso
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_impuesto_interno", value: informacionPercepciones.infoImpuestoInterno[i].impuestoInterno, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, ignoreFieldChange: false }); // ! este falso
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00, ignoreFieldChange: true });
  
                    // Si es una Orden de Venta cerrar la linea
                    log.debug(proceso, "LINE 528 - objRecord.type: " + objRecord.type);
                    if (objRecord.type == "salesorder") {
                      objRecord.setCurrentSublistValue("item", "isclosed", true, true);
                    }
                    objRecord.commitLine({ sublistId: "item" });
  
                  }
  
                }
                // Fin Grabar Informacion del Impuesto Interno en la Transaccion
                // Informo Warnings
                mensajeWarning = "Aviso : \n ";
                let mensajeWarningImpInt = "";
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
                  for (let i = 0; informacionPercepciones.mensajeErrorImpInt != null && i < informacionPercepciones.mensajeErrorImpInt.length; i++) {
                    erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + "\n";
                  }
                }
                //alert(erroresCalculoImpInterno);
                mensajeFinalAlert += erroresCalculoImpInterno;
              }
              // Informar Mensaje General
              log.debug(proceso, mensajeFinalAlert);
              alert(mensajeFinalAlert);
            } else {
              log.error(proceso, "Error Obteniendo Información de Percepciones en VENTAS");
              alert("Error Obteniendo Información de Percepciones en VENTAS");
            }
          } else {
            log.error(proceso, "Error Obteniendo Información de Percepciones en VENTAS");
            alert("Error Obteniendo Información de Percepciones en VENTAS");
          }
          log.debug(proceso, "FIN callBackPercepciones - time: " + new Date());
  
          log.debug(proceso, "FIN callBackPercepciones - time OBJ: " + objRecord);
  
          if(objRecord.type == 'creditmemo'){
            log.debug('Proceso de Percepciones Mejorado')
            validPer.validPercepciones(objRecord)
          }
  
        } catch (err) {
          log.error(proceso, "Error Calulando Percepción en VENTAS, Error : " + err.message);
          alert("Error Calulando Percepción en VENTAS, Error : " + err.message);
        }
  
        const numberOfItems = objRecord.getLineCount("item");
        log.debug(proceso, `numberOfItems: ${numberOfItems}`);
  
      }
  
      function callBackPercepcionesIVA(response, objRecord) {
        let mensajeFinalAlert = "";
        const proceso = "callBackPercepcionesIVA(cliente)";
  
        try {
  
          if (!isEmpty(response)) {
            const informacionPercepciones = JSON.parse(response.body)[0];
            console.log(informacionPercepciones);
            const param_codigo_IVA = informacionPercepciones.codigo_IVA;
            //const taxTypeDetails = informacionPercepciones.taxType;
            if (!isEmpty(informacionPercepciones)) {
  
              log.debug(proceso, `informacionPercepcionesIVA: ${JSON.stringify(informacionPercepciones)}`);
  
              const locationRec = objRecord.getValue("location");
              //objRecord.setValue({fieldId: "taxdetailsoverride", value: true});
  
              if (informacionPercepciones.error == false) {
                // Inicio Grabar Informacion de las Percepciones en la Transaccion
                if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
                  // elimino las líneas de percepciones ventas que estaban generadas en esta transacción
                  const numberOfItems = objRecord.getLineCount("item");
  
                  for (let r = 0; r < numberOfItems; r++) {
                    if (convertToBoolean(objRecord.getSublistValue("item", "custcol_l54_pv_creada", r)) == true && objRecord.getSublistValue("item", "custcol_l54_tipo_percepcion_vtas", r) == param_codigo_IVA) {
                      objRecord.selectLine({ sublistId: "item", line: r });
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                  }
  
                  for (let i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {
  
                    //FDS1 chequueo la alicuota de percepción.
                    const porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));
  
                    if (!isEmpty(porcentajeAlicuota) && (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00)) { //FDS1: Solo inserto si es distinto de 0 la alicuota de percepción
  
                      objRecord.selectNewLine({ sublistId: "item" });
  
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "item", value: informacionPercepciones.infoPercepciones[i].item, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "description", value: informacionPercepciones.infoPercepciones[i].descripcion });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoPercepciones[i].cantidad, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoPercepciones[i].importeUnitario, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoPercepciones[i].importeTotal, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoPercepciones[i].codigoImpuesto, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoPercepciones[i].porcentaje, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_jurisd_iibb_lineas", value: informacionPercepciones.infoPercepciones[i].jurisdiccion, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_pv_creada", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_es_percepcion", value: convertToBoolean(informacionPercepciones.infoPercepciones[i].procesoPV) });
  
                      // Imp. Perc. redondeado a dos decimales
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: false });// ! dejar false
  
                      // Imp. Perc. Original
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_percepcion_original", value: informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, ignoreFieldChange: false });
  
                      // Diferencia por redondeo de Imp. Percepción
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_diferencia_redondeo", value: informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, ignoreFieldChange: true });
  
                      // Base de cálculo redondeada
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_monto_imp_perc", value: informacionPercepciones.infoPercepciones[i].montoImponible, ignoreFieldChange: true });
  
                      // Base de cálculo original
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_calculo_original", value: informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_coeficiente_base_imp", value: informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_imponible_original", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_monto_suj_perc_moneda_loc", value: informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, ignoreFieldChange: true });
                      
                      // Nuevo - Grabar Norma IIBB
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_norma_iibb_perc", value: informacionPercepciones.infoPercepciones[i].normaIIBB, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Tipo Contribuyente IIBB
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tipo_contribuyente", value: informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, ignoreFieldChange: true });
  
                      // Nuevo - Grabar Campo Alicuota
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_alicuota", value: informacionPercepciones.infoPercepciones[i].porcentaje, ignoreFieldChange: true });
                      // Nuevo
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_impint_sin_desc", value: 0.00, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_impuesto_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_net_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_total_sin_desc", value: informacionPercepciones.infoPercepciones[i].importeImpuesto, ignoreFieldChange: true });
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxdetailsreference", value: "iva" + i, ignoreFieldChange: true });
  
                      objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tipo_percepcion_vtas", value: param_codigo_IVA, ignoreFieldChange: true });
  
                      // segmentos de linea
                      /*if(!isEmpty(informacionPercepciones.segmentoUbicacion)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "location", value: informacionPercepciones.segmentoUbicacion, ignoreFieldChange: true });
                      }
                      if(!isEmpty(informacionPercepciones.segmentoDepartamento)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "department", value: informacionPercepciones.segmentoDepartamento, ignoreFieldChange: true });
                      }
                      if(!isEmpty(informacionPercepciones.segmentoClase)){
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "class", value: informacionPercepciones.segmentoClase, ignoreFieldChange: true });
                      }
                      */
                      console.log('informacionPercepciones.camposOblig: ' + JSON.stringify(informacionPercepciones.obligCampos))
                      if(!isEmpty(informacionPercepciones.obligCampos) && informacionPercepciones.obligCampos != {} ){
                        var camposList = informacionPercepciones.obligCampos.campos;
                        if(camposList){
                          for (var ii=0; ii<camposList.length ; ii++){
                            var value = informacionPercepciones.obligCampos.campos[ii].value;
                            var fieldId = informacionPercepciones.obligCampos.campos[ii].fieldId;
                            objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: fieldId, value: value, ignoreFieldChange: true })
                          }
                        }
                      }
  
  
                      // Si es una Orden de Venta cerrar la linea
                      if (objRecord.type == "salesorder") {
                        objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "isclosed", value: true, ignoreFieldChange: true });
                      }
                      objRecord.commitLine({ sublistId: "item" });
  
  
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
                      agregarTaxDetailsLine(objRecord, sublistFieldTaxDetail, objTaxDetailPercep, textoDetails);
  
  
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
                      objRecord.selectLine({ sublistId: "item", line: r });
                      objRecord.removeLine({ sublistId: "item", line: r });
                      r--;
                    }
                  }
  
                  for (let i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {
  
                    objRecord.selectNewLine({ sublistId: "item" });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "item", value: informacionPercepciones.infoImpuestoInterno[i].item, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: informacionPercepciones.infoImpuestoInterno[i].cantidad, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: informacionPercepciones.infoImpuestoInterno[i].importeUnitario, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_base_calculo", value: informacionPercepciones.infoImpuestoInterno[i].baseCalculo, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "amount", value: informacionPercepciones.infoImpuestoInterno[i].importeTotal, ignoreFieldChange: false }); // ! este falso
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_codigo_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_tasa_impuesto", value: informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_impuesto_interno", value: informacionPercepciones.infoImpuestoInterno[i].impuestoInterno, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxamount", value: informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, ignoreFieldChange: false }); // ! este falso
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_porcentaje_desc_gral", value: 0, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_importe_desc_gral", value: 0.00, ignoreFieldChange: true });
                    objRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_l54_imp_neto_sin_desc", value: 0.00, ignoreFieldChange: true });
  
                    // Si es una Orden de Venta cerrar la linea
                    if (objRecord.type == "salesorder") {
                      objRecord.setCurrentSublistValue("item", "isclosed", "T", true, true);
                    }
                    objRecord.commitLine({ sublistId: "item" });
  
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
            log.debug('Proceso de Percepciones Mejorado IVA')
            validPer.validPercepciones(objRecord)
          }
          
        } catch (err) {
          alert("Error Calulando Percepcion en VENTAS , Error : " + err.message);
        }
      }
      function getConfCamposObligatorios(subsidiaria,trantype){
        try{
          var confCamposOblig = {
            campos: []
          };

          var subsidFeature = runtime.isFeatureInEffect({
              feature: 'SUBSIDIARIES'
          });
          console.log('subsidiaria,trantype'+ subsidiaria +' '+trantype)
          //*CUSTOM SEGMENT
          var filtersOblig = [];
          filtersOblig.push(search.createFilter({
            name: 'isinactive',
            operator: 'is',
            values: 'F'
          }));
          filtersOblig.push(search.createFilter({
            name: 'isinactive',
            join: "custrecord_tek_colc_parent",
            operator: 'is',
            values: 'F'
          }));
          filtersOblig.push(search.createFilter({
              name: "custrecord_tek_col_tipo_comprobante",
              join: "custrecord_tek_colc_parent",
              operator: "anyof",
              values: trantype
          }));

          if(subsidFeature){
            filtersOblig.push(search.createFilter({
              name: "custrecord_tek_col_subsidiaria",
              join: "custrecord_tek_colc_parent",
              operator: "anyof",
              values: subsidiaria
            }))
          }
          var customObligSearch = search.create({
            type: "customrecord_tek_conf_oblig_linea_fields",
            filters:filtersOblig,
            columns:[
              search.createColumn({
                name: "custrecord_tek_colc_id_campo"
              }),
              search.createColumn({
                name: "custrecord_tek_colc_valor"
              }),
              search.createColumn({
                name: "custrecord_tek_col_tipo_llenado",
                join: "custrecord_tek_colc_parent",
              }),
              search.createColumn({
                name: "custrecord_tek_col_primer_valor_lista",
                join: "custrecord_tek_colc_parent",
              }),
              search.createColumn({
                name: "custrecord_tek_col_llenado_valor_defecto",
                join: "custrecord_tek_colc_parent",
              }),
            ]
          }).run();
          var customObligResult = customObligSearch.getRange({
            start: 0,
            end: 1000
          });
          if(customObligResult.length>0){
            var tipoLlenado = customObligResult[0].getValue({name: customObligSearch.columns[2]});
            var llenadoDefecto = tipoLlenado == customObligResult[0].getValue({name: customObligSearch.columns[4]})
            var llenadoPrimerLista = tipoLlenado == customObligResult[0].getValue({name: customObligSearch.columns[3]})
            confCamposOblig.llenadoDefecto = llenadoDefecto;
            confCamposOblig.llenadoPrimerLista = llenadoPrimerLista;
            for (var i = 0; i < customObligResult.length; i++) {
              if(llenadoDefecto){
                confCamposOblig.procesado = true;
                confCamposOblig.campos.push({
                  fieldId: customObligResult[i].getValue({name: customObligSearch.columns[0]}),
                  value: customObligResult[i].getValue({name: customObligSearch.columns[1]})
                });
              }else if(llenadoPrimerLista){
                confCamposOblig.campos.push({
                  fieldId: customObligResult[i].getValue({name: customObligSearch.columns[0]}),
                });
              }
            }
          }
          console.log('confCamposOblig:'+JSON.stringify(confCamposOblig))
          return confCamposOblig

        }catch(err){
          console.log("getSegmentosObligatorio - Error : " + err.message);
          return {}
        }
      }   
  
      function convertToBoolean(string) {
        return ((isEmpty(string) || string == "F" || string == false) ? false : true);
      }
  
      function getDate(fecha, zonaHoraria) { //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
        const utc = new Date(fecha).getTime(); //GMT 0   
        zonaHoraria = isEmpty(zonaHoraria) ? 0 : zonaHoraria;
        return new Date(utc + (utc.getTimezoneOffset() * 60000) + (3600000 * zonaHoraria));
      }
  
      /* function getCompanyDate(fecha) {
                      var currentDateTime = new Date(fecha);
                      var companyTimeZone = nlapiLoadConfiguration('companyinformation').getFieldText('timezone');
                      var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : new Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
                      var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
                      var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);
                  
                      return new Date(companyDateTime);
                  } */
  
      Number.prototype.toFixedOK = function (decimals) {
        const sign = this >= 0 ? 1 : -1;
        return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
      };
  
      return {
        calcularPercepcionesVentas: calcularPercepcionesVentas
      };
    });