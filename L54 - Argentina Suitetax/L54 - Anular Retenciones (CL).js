/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
 define(["N/log", "N/search", "N/record", "N/currentRecord", "N/transaction"],
  function (log, search, record, currentRecord, transaction) {
    /* global define*/
    // migrado desde l54_SS_v2012
    function isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }
    function isEmptyOK(value) {
      return (value === "undefined" || value === undefined || value === null || value === "null" || value === "");
    }
    Number.prototype.toFixedOK = function (decimals) {
      const sign = this >= 0 ? 1 : -1;
      return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    };
    function zeroFill(number, width) {
      width -= number.toString().length;
      if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join("0") + number;
      }
      return number;
    }
    function redondeo2decimales(numero) {
      /*var original = parseFloat(numero);
                  var result = Math.round(original*100)/100 ;
                  return result;*/
      const result = parseFloat(Math.round(parseFloat(numero) * 100) / 100).toFixed(2);
      return result;
    }
    function esOneworld() {
      const filters = [search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: "F"
      }),
      search.createFilter({
        name: "custrecord_l54_es_oneworld",
        operator: search.Operator.IS,
        values: "T"
      })
      ];
      const searchresults = search.create({
        type: "customrecord_l54_datos_impositivos_emp",
        filters: filters,
      }).run().getRange({
        start: 0,
        end: 1000
      });
      if (searchresults != null && searchresults.length > 0) {
        return true;
      } else {
        return false;
      }
    }
    function getCuentaContableId(id_tipo_ret, subsidiaria) {
      let cuenta_contable_id = "";
      const columns = search.createColumn("custrecord_l54_cuenta_ret_" + id_tipo_ret);
      const filters = new Array();
      filters[0] = {
        name: "isinactive",
        operator: "is",
        values: false
      };
      if (!isEmpty(subsidiaria))
        filters[1] = search.createFilter({
          name: "custrecord_l54_subsidiaria",
          operator: search.Operator.IS,
          values: subsidiaria
        });
      let searchresults = null;
      
      searchresults = search.create({
        type: "customrecord_l54_datos_impositivos_emp",
        filters: filters,
        columns: columns
      }).run().getRange({
        start: 0,
        end: 1000
      });
      
      for (let i = 0; searchresults != null && i < searchresults.length; i++)
        cuenta_contable_id = searchresults[i].getValue("custrecord_l54_cuenta_ret_" + id_tipo_ret);
      return cuenta_contable_id;
    }
    function obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB) {
      let idCuenta = 0;
      if (!isEmpty(jurisdiccionIIBB)) {
        const filtroConfGeneral = new Array();
        filtroConfGeneral[0] = search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: "F"
        });
        if (!isEmpty(subsidiaria))
          filtroConfGeneral[1] = search.createFilter({
            name: "custrecord_l54_pv_gral_subsidiaria",
            operator: search.Operator.IS,
            values: subsidiaria
          });
        const columnaConfGeneral = new Array();
        columnaConfGeneral[0] = search.createColumn({
          name: "internalid",
        });
        const resultadosConfGeneral = search.create({
          type: "customrecord_l54_pv_iibb_config_general",
          filters: filtroConfGeneral,
          columns: columnaConfGeneral
        }).run().getRange({
          start: 0,
          end: 1000
        });
        if (resultadosConfGeneral != null && resultadosConfGeneral.length > 0) {
          const idConfGeneral = resultadosConfGeneral[0].getValue("internalid");
          if (!isEmpty(idConfGeneral) && idConfGeneral > 0) {
            log.debug("obtenerCuentaIIBB", "idConfGeneral:" + idConfGeneral);
            //
            const filtroConfDetalle = new Array();
            filtroConfDetalle[0] = search.createFilter({
              name: "custrecord_l54_pv_det_link_padre",
              operator: search.Operator.IS,
              values: idConfGeneral
            });
            filtroConfDetalle[1] = search.createFilter({
              name: "isinactive",
              operator: search.Operator.IS,
              values: "F"
            });
            filtroConfDetalle[2] = search.createFilter({
              name: "custrecord_l54_pv_det_jurisdiccion",
              operator: search.Operator.IS,
              values: jurisdiccionIIBB
            });
            const columnasConfDetalle = new Array();
            columnasConfDetalle[0] = search.createColumn({
              name: "internalid",
            });
            columnasConfDetalle[1] = search.createColumn({
              name: "custrecord_l54_pv_det_cuenta_ret",
            });
            const resultadosConfDetalle = search.create({
              type: "customrecord_l54_pv_iibb_config_detalle",
              filters: filtroConfDetalle,
              columns: columnasConfDetalle
            }).run().getRange({
              start: 0,
              end: 1000
            });
            log.debug("obtenerCuentaIIBB", "resultadosConfDetalle:" + resultadosConfDetalle + ",resultadosConfDetalle.length:" + resultadosConfDetalle.length);
            if (resultadosConfDetalle != null && resultadosConfDetalle.length > 0) {
              const cuentaRetencion = resultadosConfDetalle[0].getValue("custrecord_l54_pv_det_cuenta_ret");
              if (!isEmpty(cuentaRetencion) && cuentaRetencion > 0) {
                idCuenta = cuentaRetencion;
              }
            }
          }
        }
      }
      return idCuenta;
    }
    function anularRetenciones() {
      log.debug("anularRetenciones()", "OPEN");
      try {
        const anularRet = currentRecord.get();
        var recId = anularRet.id;
        var recType = anularRet.type;
        var record_transac = record.load({
          type: recType,
          id: recId
        });
        var anuladoNS = record_transac.getValue("voided");
        var anuladoRet = record_transac.getValue('custbody_l54_ret_anuladas');	
        if((anuladoNS=== true || anuladoNS ==="T")&& (anuladoRet=== true || anuladoRet ==="T")){
          //El pago está anulado y tilde no marcado
          alert('El pago está anulado a nivel de Netsuite. Por favor informar a un ADMINISTRADOR que debe tildar el check RETENCIONES ANULADAS manualmente');
          return false
        }
        if (confirm("El proceso de anulación de retenciones puede demorar unos segundos, desea continuar ?")) {
          try {
            const anularRet = currentRecord.get();
            var recId = anularRet.id;
            var recType = anularRet.type;
            log.debug("anularRetenciones()", "#220 - anularRet:" + anularRet);
            log.debug("anularRetenciones()", "#220 - recId:" + recId);
            log.debug("anularRetenciones()", "#220 - recType:" + recType);
          } catch (e) {
            log.debug("anularRetenciones()", "#224 - ERROR:" + e.message);
          }
          if (!isEmpty(recId)) {
            log.debug("anularRetenciones()", "#229 - into (if)");
            try {
              const filters = search.createFilter({
                name: "internalid",
                operator: search.Operator.IS,
                values: recId
              });
              const columns = new Array();
              columns[0] = search.createColumn({
                name: "recordtype",
              });
              columns[1] = search.createColumn({
                name: "tranid",
              });
              columns[2] = search.createColumn({
                name: "type",
              });
              const searchresults = search.create({
                type: search.Type.TRANSACTION,
                columns: columns,
                filters: filters,
              }).run().getRange({
                start: 0,
                end: 1000
              });
              log.debug("anularRetenciones()", "#256 - searchresults:" + searchresults.length);
              if (searchresults != null && searchresults.length > 0) {
                const retencion = new Object();
                const recordType = searchresults[0].getValue("recordtype");
                const tranid = searchresults[0].getValue("tranid");
                const tipo = searchresults[0].getValue("type");
                log.debug("anularRetenciones()", "#264 - searchresults:" + recordType);
                log.debug("anularRetenciones()", "#255 - searchresults:" + tranid);
                log.debug("anularRetenciones()", "#266 - searchresults:" + tipo);
                if (recordType == "vendorpayment") {
                  // Creo el Reverse del Asiento
                  let registroCargado = false;
                  try {
                    const recordPagoProveedor = record.load({
                      type: recordType,
                      id: recId
                    });
                    const recVoided = recordPagoProveedor.getValue("voided");
                    const recStatus = recordPagoProveedor.getValue("status");
                    var codigo_op = recordPagoProveedor.getValue("custbody_l54_numero_localizado");
                    var entity = recordPagoProveedor.getValue("entity");
                    const trandate = recordPagoProveedor.getValue("trandate");
                    var subsidiary = null;
                    log.debug("anularRetenciones", "codigo_op:" + codigo_op);
                    let oneWorld = esOneworld();
                    if (oneWorld) {
                      subsidiary = recordPagoProveedor.getValue("subsidiary");
                    }
                    const esND = recordPagoProveedor.getValue("custbody_l54_nd");
                    var tasa_pago = recordPagoProveedor.getValue("exchangerate");
                    const numerador_manual = recordPagoProveedor.getValue("custbody_l54_numerador_manual");
                    const bocaId = recordPagoProveedor.getValue("custbody_l54_boca");
                    const letraId = recordPagoProveedor.getValue("custbody_l54_letra");
                    var moneda = recordPagoProveedor.getValue("currency");
                    var department = recordPagoProveedor.getValue("department");
                    var location = recordPagoProveedor.getValue("location");
                    var clase = recordPagoProveedor.getValue("class");
                    
                    /** Cuenta Clearing */
                    var ctaBancoAuxiliar = recordPagoProveedor.getValue('custbody_l54_cuenta_banco');
                    var retencionJournal = recordPagoProveedor.getValue('custbody_l54_id_je_vendorpayment'); 

                    var cuentaClearing = false;
                    if (!isEmpty(ctaBancoAuxiliar) && !isEmpty(retencionJournal)) { // si se aplica clearing
                      cuentaClearing = true;
                    }
                    log.debug('Cuenta auxilia', ctaBancoAuxiliar);

                    let subsidiariaPago = null;
                    oneWorld = esOneworld();
                    if (oneWorld)
                      subsidiariaPago = subsidiary;
                    const tipoTransStr = "vendorpayment";
                    // Defino identificadores para las cuentas contables
                    var id_account = recordPagoProveedor.getValue("account"); // cuenta contable original del pago
                    var id_ret_ganancias = getCuentaContableId("gan", subsidiariaPago); // cuenta contable ganancias
                    var id_ret_suss = getCuentaContableId("suss", subsidiariaPago); // cuenta contable SUSS
                    var id_ret_iva = getCuentaContableId("iva", subsidiariaPago); // cuenta contable IVA
                    //var id_ret_iibb = getCuentaContableId('iibb', subsidiariaPago); // cuenta contable IIBB
                    const idsRetGanancia = recordPagoProveedor.getValue("custbody_l54_id_ret_ganancias");
                    const idsRetIVA = recordPagoProveedor.getValue("custbody_l54_id_ret_iva");
                    var idsRetIIBB = recordPagoProveedor.getValue("custbody_l54_id_ret_iibb");
                    var idsRetMuni = recordPagoProveedor.getValue("custbody_l54_id_ret_muni");
                    var idsRetINYN = recordPagoProveedor.getValue("custbody_l54_id_ret_inym");
                    const idsRetSUSS = recordPagoProveedor.getValue("custbody_l54_id_ret_suss");
                    var monto_ret_ganancias = recordPagoProveedor.getValue("custbody_l54_gan_imp_a_retener");
                    if (isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
                      monto_ret_ganancias = "0.00";
                    var monto_ret_suss = recordPagoProveedor.getValue("custbody_l54_suss_imp_a_retener");
                    if (isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
                      monto_ret_suss = "0.00";
                    var monto_ret_iva = recordPagoProveedor.getValue("custbody_l54_iva_imp_a_retener");
                    if (isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
                      monto_ret_iva = "0.00";
                    var monto_ret_iibb = recordPagoProveedor.getValue("custbody_l54_iibb_imp_a_retener");
                    if (isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
                      monto_ret_iibb = "0.00";
                    var monto_ret_muni = recordPagoProveedor.getValue("custbody_l54_municipal_imp_a_retener");
                    if (isEmpty(monto_ret_muni) || isNaN(monto_ret_muni))
                      monto_ret_muni = "0.00";
                    var monto_ret_inym = recordPagoProveedor.getValue("custbody_l54_inym_imp_a_retener");
                    if (isEmpty(monto_ret_inym) || isNaN(monto_ret_inym))
                      monto_ret_inym = "0.00";

                    monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
                    monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
                    monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
                    monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
                    monto_ret_muni = parseFloat(monto_ret_muni, 10).toFixed(2);
                    monto_ret_inym = parseFloat(monto_ret_inym, 10).toFixed(2);
                    var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10) + parseFloat(monto_ret_muni, 10) + parseFloat(monto_ret_inym, 10));
                    monto_ret_total = monto_ret_total.toFixed(2);
                    
                    /** Cuenta Clearing */
                    if(cuentaClearing){
                      var monto_retencicon = recordPagoProveedor.getValue('custbody_l54_importe_neto_a_abonar');
                      if (isEmpty(monto_retencicon) || isNaN(monto_retencicon))
                        monto_retencicon = "0.00";
                      monto_retencicon = parseFloat(monto_retencicon, 10).toFixed(2);
                      monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10)) + parseFloat(monto_ret_muni, 10) + parseFloat(monto_ret_inym, 10) + parseFloat(monto_retencicon, 10);
                      monto_ret_total = monto_ret_total.toFixed(2);
                    }

                    registroCargado = true;
                  } catch (e) {
                    registroCargado = false;
                    log.error("Error Leyendo Pago a Proveedor", "NetSuite error: " + e.message);
                  }
                  // FIX 04/06/2014
                  if (registroCargado == true) {
                    if (parseFloat(monto_ret_ganancias) != 0 || parseFloat(monto_ret_suss) != 0 || parseFloat(monto_ret_iva) != 0 || parseFloat(monto_ret_iibb) != 0 || parseFloat(monto_ret_muni) != 0 || parseFloat(monto_ret_inym) != 0) {
                      // creo un journal entry con el reverse del journal entry que cree en el alta de la transacciÃ³n
                      const record_journalentry = record.create({
                        type: record.Type.JOURNAL_ENTRY,
                        isDynamic: true
                      });
                      record_journalentry.setValue({
                        fieldId: "custbody_l54_op_asociado",
                        value: codigo_op
                      });
                      record_journalentry.setValue({
                        fieldId: "memo",
                        value: codigo_op
                      });
                      if (!isEmpty(subsidiary)) {
                        record_journalentry.setValue({
                          fieldId: "subsidiary",
                          value: subsidiary
                        });
                      }
                      //record_journalentry.setFieldValue('trandate', trandate);
                      record_journalentry.setValue({
                        fieldId: "currency",
                        value: moneda
                      });
                      tasa_pago = parseFloat(tasa_pago);
                      record_journalentry.setValue({
                        fieldId: "exchangerate",
                        value: tasa_pago
                      });
                      record_journalentry.selectNewLine({
                        sublistId: "line"
                      });
                      record_journalentry.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "entity",
                        value: entity
                      });
                      if (!isEmpty(department))
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "department",
                          value: department
                        });
                      if (!isEmpty(location))
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "location",
                          value: location
                        });
                      if (!isEmpty(clase))
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "class",
                          value: clase
                        });
                      record_journalentry.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "memo",
                        value: codigo_op
                      });
                      record_journalentry.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "account",
                        value: id_account
                      });
                      monto_ret_total = parseFloat(monto_ret_total);
                      record_journalentry.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "credit",
                        value: monto_ret_total
                      });
                      record_journalentry.commitLine({
                        sublistId: "line"
                      });

                        if(cuentaClearing){
                          record_journalentry.selectNewLine({
                            sublistId: "line"
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "entity",
                            value: entity
                          });

                          if (!isEmpty(department))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "department",
                              value: department
                            });

                          if (!isEmpty(location))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "location",
                              value: location
                            });

                          if (!isEmpty(clase))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "class",
                              value: clase
                            });

                          // retenciones ganancias
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "memo",
                            value: codigo_op
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "account",
                            value: ctaBancoAuxiliar
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "debit",
                            value: parseFloat(monto_retencicon)
                          });
                          record_journalentry.commitLine('line');
											}

                      // si tiene retenciones de ganancias
                      if (parseFloat(monto_ret_ganancias) != 0 && parseFloat(monto_ret_ganancias) != "") {
                        record_journalentry.selectNewLine({
                          sublistId: "line"
                        });
                        //record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "entity",
                          value: entity
                        });
                        if (!isEmpty(department))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "department",
                            value: department
                          });
                        if (!isEmpty(location))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "location",
                            value: location
                          });
                        if (!isEmpty(clase))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "class",
                            value: clase
                          });
                        // retenciones ganancias
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "memo",
                          value: codigo_op
                        });
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "account",
                          value: id_ret_ganancias
                        });
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "debit",
                          value: monto_ret_ganancias
                        });
                        record_journalentry.commitLine({
                          sublistId: "line"
                        });
                      }
                      // si tiene retenciones de SUSS
                      if (parseFloat(monto_ret_suss) != 0 && parseFloat(monto_ret_suss) != "") {
                        record_journalentry.selectNewLine("line");
                        //record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "entity",
                          value: entity
                        });
                        if (!isEmpty(department))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "department",
                            value: department
                          });
                        if (!isEmpty(location)) {
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "location",
                            value: location
                          });
                        }
                        if (!isEmpty(clase))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "class",
                            value: clase
                          });
                        // retenciones SUSS
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "memo",
                          value: codigo_op
                        });
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "account",
                          value: id_ret_suss
                        });
                        monto_ret_suss = parseFloat(monto_ret_suss);
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "debit",
                          value: monto_ret_suss
                        });
                        record_journalentry.commitLine({
                          sublistId: "line"
                        });
                      }
                      // si tiene retenciones de IVA
                      if (parseFloat(monto_ret_iva) != 0 && parseFloat(monto_ret_iva) != "") {
                        record_journalentry.selectNewLine("line");
                        //record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "entity",
                          value: entity
                        });
                        if (!isEmpty(department)) {
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "department",
                            value: department
                          });
                        }
                        if (!isEmpty(location))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "location",
                            value: location
                          });
                        if (!isEmpty(clase))
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "class",
                            value: clase
                          });
                        // retenciones IVA
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "memo",
                          value: codigo_op
                        });
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "account",
                          value: id_ret_iva
                        });
                        monto_ret_iva = parseFloat(monto_ret_iva);
                        record_journalentry.setCurrentSublistValue({
                          sublistId: "line",
                          fieldId: "debit",
                          value: monto_ret_iva
                        });
                        record_journalentry.commitLine({
                          sublistId: "line"
                        });
                      }
                      // si tiene retenciones de IIBB
                      if (parseFloat(monto_ret_iibb) != 0 && parseFloat(monto_ret_iibb) != "") {
                        // 2015 - IIBB por Jurisdicciones
                        const arrayIDIIBB = idsRetIIBB.split(",");
                        for (let j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
                          var recordRetencion = record.load({
                            type: "customrecord_l54_retencion",
                            id: arrayIDIIBB[j]
                          });
                          const jurisdiccionIIBB = recordRetencion.getValue("custrecord_l54_ret_jurisdiccion");
                          const cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
                          //var cuentaIIBB = recordRetencion.getValue("custrecord_l54_ret_cuenta");
                          let importeIIBB = recordRetencion.getValue("custrecord_l54_ret_importe");
                          record_journalentry.selectNewLine("line");
                          //record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "entity",
                            value: entity
                          });
                          if (!isEmpty(department))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "department",
                              value: department
                            });
                          if (!isEmpty(location))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "location",
                              value: location
                            });
                          if (!isEmpty(clase))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "class",
                              value: clase
                            });
                          // retenciones IIBB
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "memo",
                            value: codigo_op
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "account",
                            value: cuentaIIBB
                          });
                          importeIIBB = parseFloat(importeIIBB);
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "debit",
                            value: importeIIBB
                          });
                          record_journalentry.commitLine({
                            sublistId: "line"
                          });
                        }
                      }


                      // si tiene retencione Municipal
                      if (parseFloat(monto_ret_muni) != 0 && parseFloat(monto_ret_muni) != "") {
                        // 2015 - IIBB por Jurisdicciones
                        const arrayIDMuni = idsRetMuni.split(",");
                        for (let j = 0; arrayIDMuni != null && j < arrayIDMuni.length; j++) {
                          var recordRetencion = record.load({
                            type: "customrecord_l54_retencion",
                            id: arrayIDMuni[j]
                          });
                          const jurisdiccionIIBB = recordRetencion.getValue("custrecord_l54_ret_jurisdiccion");
                          const cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
                          //var cuentaIIBB = recordRetencion.getValue("custrecord_l54_ret_cuenta");
                          let importeMuni = recordRetencion.getValue("custrecord_l54_ret_importe");
                          record_journalentry.selectNewLine("line");
                          //record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "entity",
                            value: entity
                          });
                          if (!isEmpty(department))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "department",
                              value: department
                            });
                          if (!isEmpty(location))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "location",
                              value: location
                            });
                          if (!isEmpty(clase))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "class",
                              value: clase
                            });
                          // retenciones IIBB
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "memo",
                            value: codigo_op
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "account",
                            value: cuentaIIBB
                          });
                          importeMuni = parseFloat(importeMuni);
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "debit",
                            value: importeMuni
                          });
                          record_journalentry.commitLine({
                            sublistId: "line"
                          });
                        }
                      }

                      // si tiene retencione INYN
                      if (parseFloat(monto_ret_inym) != 0 && parseFloat(monto_ret_inym) != "") {
                        // 2015 - IIBB por Jurisdicciones
                        const arrayIDINYN = idsRetINYN.split(",");
                        for (let j = 0; arrayIDINYN != null && j < arrayIDINYN.length; j++) {
                          var recordRetencion = record.load({
                            type: "customrecord_l54_retencion",
                            id: arrayIDINYN[j]
                          });
                          const jurisdiccionIIBB = recordRetencion.getValue("custrecord_l54_ret_jurisdiccion");
                          const cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
                          //var cuentaIIBB = recordRetencion.getValue("custrecord_l54_ret_cuenta");
                          let importeINYM = recordRetencion.getValue("custrecord_l54_ret_importe");
                          record_journalentry.selectNewLine("line");
                          //record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "entity",
                            value: entity
                          });
                          if (!isEmpty(department))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "department",
                              value: department
                            });
                          if (!isEmpty(location))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "location",
                              value: location
                            });
                          if (!isEmpty(clase))
                            record_journalentry.setCurrentSublistValue({
                              sublistId: "line",
                              fieldId: "class",
                              value: clase
                            });
                          // retenciones IIBB
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "memo",
                            value: codigo_op
                          });
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "account",
                            value: cuentaIIBB
                          });
                          importeINYM = parseFloat(importeINYM);
                          record_journalentry.setCurrentSublistValue({
                            sublistId: "line",
                            fieldId: "debit",
                            value: importeINYM
                          });
                          record_journalentry.commitLine({
                            sublistId: "line"
                          });
                        }
                      }
                  /* INICIO - ANULACION DE ACUMULADOS PARA PAGO */

									// Busco los acumulados del Pago
                  var resultadosAcumulados = search.create({
                    type: 'customrecord_l54_acumulados_retenciones',
                    columns: [
                      {
                        name: 'internalid'
                      }
                    ],
                    filters: [
                      {
                        name: 'custrecord_l54_acum_ret_pago_asoc',
                        operator: 'anyof',
                        values: recId
                      },{
                        name: 'isinactive',
                        operator: 'is',
                        values: ['F']
                      }
                    ]
                }).run().getRange({
                  start: 0,
                  end: 1000
                });
									
									for (var j = 0; resultadosAcumulados != null && j < resultadosAcumulados.length; j++) {
										try {
                      record.submitFields({
                        type: 'customrecord_l54_acumulados_retenciones',
                        id: resultadosAcumulados[j].getValue('internalid'),
                        values: {
                          custrecord_l54_acum_ret_anulado: true
                        },
                        options: {
                          enableSourcing: false,
                          ignoreMandatoryFields: true
                        }
                      });
											
										} catch (e) {
											log.error('ERROR Anulando Acumulado', 'ID Interno Retencion : ' + resultadosAcumulados[j].getFieldValue('internalid') + ' NetSuite error: ' + e.message);
										}
									}

									/* FIN - ANULACION DE ACUMULADOS PARA PAGO */

                      try {
                        var idTmp = record_journalentry.save();
                        log.debug('idTmp xddd' , idTmp != null)
                        if(idTmp != null && idTmp != ''){
                          record.submitFields({
                            type: recType,
                            id: recId,
                            values: {
                              custbody_l54_id_void_journal: idTmp
                            },
                            options: {
                              enableSourcing: false,
                              ignoreMandatoryFields: true
                            }
                          });
                        }
                      } catch (e) {
                        log.error("Error generando el journalentry (Edit)", "NetSuite error: " + e.message);
                      }
                    }
                  }
                  // Fin Crear Reverse del ASiento
                  // Busco las Retenciones del Pago
                  const filtroRetenciones = new Array();
                  filtroRetenciones[0] = search.createFilter({
                    name: "custrecord_l54_ret_ref_pago_prov",
                    operator: search.Operator.IS,
                    values: recId
                  });
                  filtroRetenciones[1] = search.createFilter({
                    name: "isinactive",
                    operator: search.Operator.IS,
                    values: "F"
                  });
                  const columnaRetenciones = search.createColumn({
                    name: "internalid",
                  });
                  const resultadoRetenciones = search.create({
                    type: "customrecord_l54_retencion",
                    columns: columnaRetenciones,
                    filters: filtroRetenciones,
                  }).run().getRange({
                    start: 0,
                    end: 1000
                  });
                  for (let j = 0; resultadoRetenciones != null && j < resultadoRetenciones.length; j++) {
                    const resultRetencion = resultadoRetenciones[j].getValue("internalid");
                    recordRetencion = record.load({
                      type: "customrecord_l54_retencion",
                      id: resultRetencion,
                      isDynamic: true
                    });
                    recordRetencion.setValue("custrecord_l54_ret_anulado", true);
                    try {
                      const idRR = recordRetencion.save();
                    } catch (e) {
                      log.error("Error Anulando Retencion", "ID Interno Retencion : " + resultadoRetenciones[j].getValue("internalid") + " NetSuite error: " + e.message);
                    }
                  }
                  try {
                    const voidingId = transaction.void({
                      type: recType,
                      id: recId
                    });
                    log.debug("Anular Pago", "Pago anulado exitosamente.");
                  } catch (e) {
                    log.error("Error Anulando Pago", "No se pudo anular el pago - Netsuite Exception: " + JSON.stringify(e.message));
                  }
                  try {
                    record.submitFields({
                      type: recType,
                      id: recId,
                      values: {
                        custbody_l54_ret_anuladas: "T"
                      },
                      options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                      }
                    });
                    
                    alert("El proceso de anulación de retenciones culminó exitosamente");
                  } catch (e) {
                    log.error("Error Anulando Retencion", "Error: Seteando campo de Retenciones Anuladas - NetSuite error: " + e.message);
                  }
                }
              }
            } catch (e) {
              log.error("Error Anulando Retenciones", "NetSuite error: " + e.message);
            }
          }
        }
        log.debug("anularRetenciones()", "CLOSE");
      }
      catch (e) {
        log.debug("anularRetenciones()", "ERROR - #719:" + e.message + " trace: " + e.stack);
        log.debug("anularRetenciones()", "ERROR - MESSAGE:" + e.message);
        log.debug("anularRetenciones()", "ERROR:" + e);
      }
    }
    return {
      anularRetenciones: anularRetenciones
    };
  });