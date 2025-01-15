/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @NAmdConfig /SuiteScripts/configuration.json
 */

define(["N/currentRecord", "N/format", "L54/utilidades", "N/runtime", "N/https", "N/url"],
    function (currentRecord, format, utilidades, runtime, https, url) {
        /* global define log */
        /* eslint-disable no-var */
        function calcularRetenciones() {

            try {
                var script = runtime.getCurrentScript();

                log.audit("Governance Monitoring", "LINE 15 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                var recVendorPayment = currentRecord.get();

                //INF CABECERA
                var entity = recVendorPayment.getValue({
                    fieldId: "entity"
                });

                var id_posting_period = recVendorPayment.getValue({
                    fieldId: "postingperiod"
                });

                var tasa_cambio_pago = recVendorPayment.getValue({
                    fieldId: "exchangerate"
                });

                var total = recVendorPayment.getValue({
                    fieldId: "total"
                });

                var trandate = recVendorPayment.getValue({
                    fieldId: "trandate"
                });

                var moneda = recVendorPayment.getValue({
                    fieldId: "currency"
                });

                var fecha = recVendorPayment.getValue({
                    fieldId: "trandate"
                });

                //log.error('cliente', 'Fecha: ' + fecha);
                var fechaAux = formatDate(fecha);
                //log.error('cliente', 'Fecha con función formatDate: ' + fechaAux);

                var tipoContribuyente = recVendorPayment.getValue({
                    fieldId: "custbody_l54_tipo_contribuyente"
                });

                var subsidiariaPago = null;

                var esOneWorld = utilidades.l54esOneworld();

                if (esOneWorld) {
                    subsidiariaPago = recVendorPayment.getValue({
                        fieldId: "subsidiary"
                    });
                }

                //ARRAY INFORMACIÓN PAGO
                trandate = (!utilidades.isEmpty(trandate)) ? trandate : "";
                fecha = (!utilidades.isEmpty(fecha)) ? fecha : "";
                var infPago = new Object();
                infPago.entity = entity;
                infPago.periodo = id_posting_period;
                infPago.tipoCambio = tasa_cambio_pago;
                infPago.importeTotal = total;
                infPago.trandate = [];
                infPago.trandate.push(trandate);
                infPago.fecha = [];
                infPago.fecha.push(fechaAux);
                infPago.moneda = moneda;
                infPago.subsidiaria = subsidiariaPago;
                infPago.esOneWorld = esOneWorld;
                infPago.tipoContribuyente = tipoContribuyente;
                infPago.facturas = new Array();

                var cantItems = recVendorPayment.getLineCount({
                    sublistId: "apply"
                });

                if ((!utilidades.isEmpty(total)) && (total > 0.00)) {
                    for (var i = 0; !utilidades.isEmpty(cantItems) && i < cantItems; i++) {

                        var fldApply = recVendorPayment.getSublistValue({ sublistId: "apply", fieldId: "apply", line: i });

                        if (fldApply == true) {
                            var id_vendorbill = recVendorPayment.getSublistValue({ sublistId: "apply", fieldId: "doc", line: i });
                            var amount = recVendorPayment.getSublistValue({ sublistId: "apply", fieldId: "amount", line: i });
                            var objFactura = new Object();
                            objFactura.idVendorBill = id_vendorbill;
                            objFactura.linea = i;
                            objFactura.amount = amount;
                            infPago.facturas.push(objFactura);
                        }
                    }
                }

                var mensaje = "El proceso de cálculo de retenciones puede demorar unos segundos, ¿desea continuar ?";
                var ejecutarProceso = false;

                if (confirm(mensaje)) {
                    ejecutarProceso = true;
                }

                if (ejecutarProceso) {

                    log.audit("Governance Monitoring", "LINE 106 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                    infPago.facturas = JSON.stringify(infPago.facturas);
                    infPago.trandate = JSON.stringify(infPago.trandate);
                    infPago.fecha = JSON.stringify(infPago.fecha);

                    var new_url = url.resolveScript({
                        scriptId: "customscript_l54_calcular_ret_suitelet",
                        deploymentId: "customdeploy_l54_calcular_ret_suitelet"
                    });

                    log.audit("calcularRetenciones", "informacionPagoJson: " + JSON.stringify(infPago));

                    var respuestaAux = https.post({
                        url: new_url,
                        body: infPago
                    });

                    log.audit("calcularRetenciones", "LINE 131 - informacionPagoJson: " + JSON.stringify(respuestaAux));

                    if (!utilidades.isEmpty(respuestaAux)) {

                        var respuesta = JSON.parse(respuestaAux.body);

                        log.audit("calcularRetenciones", "LINE 130 - RESPUESTA: " + JSON.stringify(respuesta));
                        console.log("LINEA 140 respuestaAux.body", respuesta);
                        if (!utilidades.isEmpty(respuesta) && respuesta.length > 0) {

                            var informacionRetenciones = respuesta[0];

                            log.audit("calcularRetenciones", "LINE 136 - informacionRetenciones: " + JSON.stringify(informacionRetenciones));

                            var logeoBraian = JSON.stringify(informacionRetenciones);
                            var chunkSize = 3000; // Tamaño máximo de cada chunk
                            for (var i = 0; i < logeoBraian.length; i += chunkSize) {
                                var chunk = logeoBraian.substring(i, i + chunkSize);
                                log.audit("LINE 150 informacionRetenciones CHUNK=" + i + chunkSize, "CHUNK=" + chunk);
                            }


                            if (!utilidades.isEmpty(informacionRetenciones)) {

                                if (informacionRetenciones.error == false) {

                                    // Nuevo - Elimino Retenciones Previas de la Sublista de Retenciones Antes de Grabar la Sublista de Retenciones
                                    var cantidadRetenciones = recVendorPayment.getLineCount({ sublistId: "custpage_sublistretenciones" });
                                    var importeTotalGanancias = 0.00;
                                    var importeTotalSUSS = 0.00;
                                    var importeTotalIVA = 0.00;
                                    var importeTotalIIBB = 0.00;
                                    var importeTotalMuni = 0.00;

                                    log.audit("Governance Monitoring", "LINE 151 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                    log.audit("calcularRetenciones", "LINE 149 - Log de control - Cantidad Retenciones: " + cantidadRetenciones);

                                    for (var i = cantidadRetenciones; i >= 0; i--) {

                                        var lineNum = recVendorPayment.selectLine({
                                            sublistId: "custpage_sublistretenciones",
                                            line: i
                                        });

                                        log.audit("calcularRetenciones", "LINE 158 - Log de control - Cantidad Retenciones: " + cantidadRetenciones);

                                        recVendorPayment.setCurrentSublistValue({
                                            sublistId: "custpage_sublistretenciones",
                                            fieldId: "custrecord_l54_ret_sistema_eliminar",
                                            value: true, //T
                                            ignoreFieldChange: true
                                        });

                                        recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });

                                        log.audit("calcularRetenciones", "LINE 178 - Log de control - Cantidad Retenciones: " + cantidadRetenciones);

                                        recVendorPayment.removeLine({
                                            sublistId: "custpage_sublistretenciones",
                                            line: 0,
                                            ignoreRecalc: false
                                        });

                                        log.audit("calcularRetenciones", "LINE 186 - Log de control - Cantidad Retenciones: " + cantidadRetenciones);
                                    }

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_gan_imp_a_retener",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_suss_imp_a_retener",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_iva_imp_a_retener",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_iibb_imp_a_retener",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_municipal_imp_a_retener",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_total_retencion",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_base_calculo_ret_gan",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_base_calculo_ret_suss",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_base_calculo_ret_iva",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_base_calculo_ret_iibb",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_iva",
                                        value: 0.00
                                    });
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_percepciones",
                                        value: 0.00
                                    });

                                    log.audit("calcularRetenciones", "LINE 229 - Log de control - AGENTE GANANCIAS");
                                    log.audit("Governance Monitoring", "LINE 230 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                    // Grabo Informacion de las Retenciones en el Pago
                                    // Solo si la compania es Agente de Retención del regimen y si el proveedor esta inscripto al regimen
                                    if (informacionRetenciones.esAgenteRetencionGan) {
                                        if (informacionRetenciones.estaInscriptoRegimenGan) {

                                            importeTotalGanancias = 0.00;

                                            for (var i = 0; informacionRetenciones.retencion_ganancias != null && i < informacionRetenciones.retencion_ganancias.length; i++) {
                                                var importeRetener = informacionRetenciones.retencion_ganancias[i].imp_retencion;
                                                importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);

                                                var lineNum = recVendorPayment.selectNewLine({
                                                    sublistId: "custpage_sublistretenciones"
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_retencion",
                                                    value: informacionRetenciones.retencion_ganancias[i].retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_tipo_ret",
                                                    value: informacionRetenciones.retencion_ganancias[i].tipo_ret,
                                                    ignoreFieldChange: false
                                                });


                                                if (!utilidades.isEmpty(informacionRetenciones.retencion_ganancias[i].alicuota) && !isNaN(informacionRetenciones.retencion_ganancias[i].alicuota) && parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota, 10) > 0.00) {
                                                    var alicuotaRet = parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota, 10);
                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_porcentaje",
                                                        value: alicuotaRet,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_condicion",
                                                    value: informacionRetenciones.retencion_ganancias[i].condicion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_net_bill",
                                                    value: informacionRetenciones.retencion_ganancias[i].neto_bill,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo",
                                                    value: informacionRetenciones.retencion_ganancias[i].base_calculo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_imp",
                                                    value: informacionRetenciones.retencion_ganancias[i].base_calculo_imp,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_imp_a_retener",
                                                    value: informacionRetenciones.retencion_ganancias[i].imp_retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_insertar",
                                                    value: true, //T
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_eliminar",
                                                    value: false, //F
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_diferencia_redondeo",
                                                    value: informacionRetenciones.retencion_ganancias[i].diferenciaRedondeo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_importe_ret_original",
                                                    value: informacionRetenciones.retencion_ganancias[i].imp_retencion_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_original",
                                                    value: informacionRetenciones.retencion_ganancias[i].base_calculo_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc",
                                                    value: informacionRetenciones.retencion_ganancias[i].monto_suj_ret_moneda_local,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });
                                            }

                                            recVendorPayment.setValue({
                                                fieldId: "custbody_l54_gan_imp_a_retener",
                                                value: importeTotalGanancias,
                                                ignoreFieldChange: false
                                            });

                                        }
                                    }//FIN IF (INFORMACIONRETENCIONES.ESAGENTERETENCIONGAN)

                                    log.audit("Governance Monitoring", "LINE 333 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                    log.audit("calcularRetenciones", "LINE 334 - Log de control - AGENTE SUUS");

                                    if (informacionRetenciones.esAgenteRetencionSUSS) {
                                        if (informacionRetenciones.estaInscriptoRegimenSUSS) {
                                            importeTotalSUSS = 0.00;

                                            for (var i = 0; informacionRetenciones.retencion_suss != null && i < informacionRetenciones.retencion_suss.length; i++) {
                                                var importeRetener = informacionRetenciones.retencion_suss[i].imp_retencion;
                                                importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);

                                                var lineNum = recVendorPayment.selectNewLine({
                                                    sublistId: "custpage_sublistretenciones"
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_retencion",
                                                    value: informacionRetenciones.retencion_suss[i].retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_tipo_ret",
                                                    value: informacionRetenciones.retencion_suss[i].tipo_ret,
                                                    ignoreFieldChange: false
                                                });

                                                if (!utilidades.isEmpty(informacionRetenciones.retencion_suss[i].alicuota) && !isNaN(informacionRetenciones.retencion_suss[i].alicuota) && parseFloat(informacionRetenciones.retencion_suss[i].alicuota, 10) > 0.00) {
                                                    var alicuotaRet = parseFloat(informacionRetenciones.retencion_suss[i].alicuota, 10);
                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_porcentaje",
                                                        value: alicuotaRet,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_condicion",
                                                    value: informacionRetenciones.retencion_suss[i].condicion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_net_bill",
                                                    value: informacionRetenciones.retencion_suss[i].neto_bill,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo",
                                                    value: informacionRetenciones.retencion_suss[i].base_calculo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_imp",
                                                    value: informacionRetenciones.retencion_suss[i].base_calculo_imp,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_imp_a_retener",
                                                    value: informacionRetenciones.retencion_suss[i].imp_retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_insertar",
                                                    value: true, //T
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_eliminar",
                                                    value: false, //F
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_diferencia_redondeo",
                                                    value: informacionRetenciones.retencion_suss[i].diferenciaRedondeo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_importe_ret_original",
                                                    value: informacionRetenciones.retencion_suss[i].imp_retencion_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_original",
                                                    value: informacionRetenciones.retencion_suss[i].base_calculo_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc",
                                                    value: informacionRetenciones.retencion_suss[i].monto_suj_ret_moneda_local,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });
                                            }

                                            recVendorPayment.setValue({
                                                fieldId: "custbody_l54_suss_imp_a_retener",
                                                value: importeTotalSUSS,
                                                ignoreFieldChange: false
                                            });

                                        }
                                    }//FIN IF (INFORMACIONRETENCIONES.ESAGENTERETENCIONSUSS)

                                    log.audit("Governance Monitoring", "LINE 432 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                    log.audit("calcularRetenciones", "LINE 433 - Log de control - AGENTE IVA");

                                    if (informacionRetenciones.esAgenteRetencionIVA) {
                                        if (informacionRetenciones.estaInscriptoRegimenIVA) {
                                            importeTotalIVA = 0.00;

                                            for (var i = 0; informacionRetenciones.retencion_iva != null && i < informacionRetenciones.retencion_iva.length; i++) {
                                                var importeRetener = informacionRetenciones.retencion_iva[i].imp_retencion;
                                                importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);

                                                var lineNum = recVendorPayment.selectNewLine({
                                                    sublistId: "custpage_sublistretenciones"
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_retencion",
                                                    value: informacionRetenciones.retencion_iva[i].retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_tipo_ret",
                                                    value: informacionRetenciones.retencion_iva[i].tipo_ret,
                                                    ignoreFieldChange: false
                                                });

                                                if (!utilidades.isEmpty(informacionRetenciones.retencion_iva[i].alicuota) && !isNaN(informacionRetenciones.retencion_iva[i].alicuota) && parseFloat(informacionRetenciones.retencion_iva[i].alicuota, 10) > 0.00) {
                                                    var alicuotaRet = parseFloat(informacionRetenciones.retencion_iva[i].alicuota, 10);
                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_porcentaje",
                                                        value: alicuotaRet,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_condicion",
                                                    value: informacionRetenciones.retencion_iva[i].condicion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_net_bill",
                                                    value: informacionRetenciones.retencion_iva[i].neto_bill,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo",
                                                    value: informacionRetenciones.retencion_iva[i].base_calculo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_imp",
                                                    value: informacionRetenciones.retencion_iva[i].base_calculo_imp,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_imp_a_retener",
                                                    value: informacionRetenciones.retencion_iva[i].imp_retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_insertar",
                                                    value: true, //T
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_eliminar",
                                                    value: false, //F
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_diferencia_redondeo",
                                                    value: informacionRetenciones.retencion_iva[i].diferenciaRedondeo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_importe_ret_original",
                                                    value: informacionRetenciones.retencion_iva[i].imp_retencion_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_original",
                                                    value: informacionRetenciones.retencion_iva[i].base_calculo_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc",
                                                    value: informacionRetenciones.retencion_iva[i].monto_suj_ret_moneda_local,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });

                                            }

                                            recVendorPayment.setValue({
                                                fieldId: "custbody_l54_iva_imp_a_retener",
                                                value: importeTotalIVA,
                                                ignoreFieldChange: false
                                            });

                                        }
                                    }//FIN IF IF (INFORMACIONRETENCIONES.ESAGENTERETENCIONIVA)

                                    log.audit("Governance Monitoring", "LINE 533 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                    log.audit("calcularRetenciones", "LINE 534 - Log de control AGENTE IIBB");

                                    if (informacionRetenciones.esAgenteRetencionIIBB) {
                                        if (informacionRetenciones.estaInscriptoRegimenIIBB) {
                                            importeTotalIIBB = 0.00; 
                                            importeTotalMuni = 0.00;

                                            for (var i = 0; informacionRetenciones.retencion_iibb != null && i < informacionRetenciones.retencion_iibb.length; i++) {
                                                var importeRetener = informacionRetenciones.retencion_iibb[i].imp_retencion;

                                                log.debug("informacionRetenciones.retencion_iibb[i].retencion", informacionRetenciones.retencion_iibb[i])
                                                if(informacionRetenciones.retencion_iibb[i].retencion == 5){
                                                    importeTotalMuni = parseFloat(importeTotalMuni, 10) + parseFloat(importeRetener, 10);
                                                }else{
                                                    importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);
                                                }

                                                var lineNum = recVendorPayment.selectNewLine({
                                                    sublistId: "custpage_sublistretenciones"
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_retencion",
                                                    value: informacionRetenciones.retencion_iibb[i].retencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_tipo_ret",
                                                    value: informacionRetenciones.retencion_iibb[i].tipo_ret,
                                                    ignoreFieldChange: false
                                                });

                                                if (!utilidades.isEmpty(informacionRetenciones.retencion_iibb[i].alicuota) && !isNaN(informacionRetenciones.retencion_iibb[i].alicuota) && parseFloat(informacionRetenciones.retencion_iibb[i].alicuota, 10) > 0.00) {
                                                    var alicuotaRet = parseFloat(informacionRetenciones.retencion_iibb[i].alicuota, 10);
                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_porcentaje",
                                                        value: alicuotaRet,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_jurisdiccion",
                                                    value: informacionRetenciones.retencion_iibb[i].jurisdiccion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_condicion",
                                                    value: informacionRetenciones.retencion_iibb[i].condicion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_net_bill",
                                                    value: informacionRetenciones.retencion_iibb[i].neto_bill,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo",
                                                    value: informacionRetenciones.retencion_iibb[i].base_calculo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_imp",
                                                    value: informacionRetenciones.retencion_iibb[i].base_calculo_imp,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_imp_a_retener",
                                                    value: informacionRetenciones.retencion_iibb[i].imp_retencion,
                                                    ignoreFieldChange: false
                                                });

                                                // NUEVO - ID DE TIPO CONTRIBUYENTE
                                                if (!utilidades.isEmpty(informacionRetenciones.retencion_iibb[i].condicionID)) {
                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_id_tipo_contr",
                                                        value: informacionRetenciones.retencion_iibb[i].condicionID,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_id_tipo_exen",
                                                    value: informacionRetenciones.retencion_iibb[i].tipoExencion,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_cert_exen",
                                                    value: informacionRetenciones.retencion_iibb[i].certExencion,
                                                    ignoreFieldChange: false
                                                });

                                                var fechaExencion = informacionRetenciones.retencion_iibb[i].fcaducidadExencion;

                                                if (!utilidades.isEmpty(fechaExencion)) {
                                                    fechaExencion = new Date(fechaExencion);
                                                    //log.error('cliente', 'fechaExencion con new Date: ' + fechaExencion);
                                                    var fechaExencionString = parseDate(fechaExencion);
                                                    //log.error('cliente', 'fechaExencionString: ' + fechaExencionString);

                                                    recVendorPayment.setCurrentSublistValue({
                                                        sublistId: "custpage_sublistretenciones",
                                                        fieldId: "custrecord_l54_ret_fecha_exen",
                                                        value: fechaExencionString,
                                                        ignoreFieldChange: false
                                                    });
                                                }

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_insertar",
                                                    value: true, //T
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_sistema_eliminar",
                                                    value: false, //F
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_diferencia_redondeo",
                                                    value: informacionRetenciones.retencion_iibb[i].diferenciaRedondeo,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_importe_ret_original",
                                                    value: informacionRetenciones.retencion_iibb[i].imp_retencion_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_base_calculo_original",
                                                    value: informacionRetenciones.retencion_iibb[i].base_calculo_original,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.setCurrentSublistValue({
                                                    sublistId: "custpage_sublistretenciones",
                                                    fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc",
                                                    value: informacionRetenciones.retencion_iibb[i].monto_suj_ret_moneda_local,
                                                    ignoreFieldChange: false
                                                });

                                                recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });

                                            }

                                            recVendorPayment.setValue({
                                                fieldId: "custbody_l54_municipal_imp_a_retener",
                                                value: importeTotalMuni,
                                                ignoreFieldChange: false
                                            });

                                            recVendorPayment.setValue({
                                                fieldId: "custbody_l54_iibb_imp_a_retener",
                                                value: importeTotalIIBB,
                                                ignoreFieldChange: false
                                            });
                                        }
                                    }//FIN IF (INFORMACIONRETENCIONES.ESAGENTERETENCIONIIBB)

                                    log.audit("Governance Monitoring", "LINE 716 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                    var importeTotalRetencion = parseFloat(importeTotalGanancias, 10) + parseFloat(importeTotalIVA, 10) + parseFloat(importeTotalIIBB, 10) + parseFloat(importeTotalMuni, 10) + parseFloat(importeTotalSUSS, 10);
                                    var total = recVendorPayment.getValue({ fieldId: "total" });
                                    var importeNetoAbonar = parseFloat(total, 10) - parseFloat(importeTotalRetencion, 10);

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_neto_a_abonar",
                                        value: importeNetoAbonar,
                                        ignoreFieldChange: false
                                    });

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_neto_bill_aplicados",
                                        value: informacionRetenciones.neto_bill_aplicados,
                                        ignoreFieldChange: false
                                    });

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_total_retencion",
                                        value: importeTotalRetencion,
                                        ignoreFieldChange: false
                                    });

                                    // PARA TXT DE RETENCIONES
                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_iva",
                                        value: informacionRetenciones.importe_iva,
                                        ignoreFieldChange: false
                                    });

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_importe_percepciones",
                                        value: informacionRetenciones.importe_percepciones,
                                        ignoreFieldChange: false
                                    });

                                    // Guardo la Fecha de la Version para saber a que funcion de Imprimir PDF de Retenciones Utilizar
                                    // si el Pago a Proveedor no tiene configurado este campo con la fecha o es otra fecha no es esta version

                                    recVendorPayment.setValue({
                                        fieldId: "custbody_l54_version_calc_ret",
                                        value: informacionRetenciones.version_calc_ret,
                                        ignoreFieldChange: false
                                    });

                                    log.audit("calcularRetenciones", "LINE 751 - Log de control");

                                    var mensajeWarning = "";
                                    var j = 1;
                                    if (informacionRetenciones.warning == true) {
                                        for (var i = 0; informacionRetenciones.mensajeWarning != null && i < informacionRetenciones.mensajeWarning.length; i++) {
                                            if (!utilidades.isEmpty(informacionRetenciones.mensajeWarning[i])) {
                                                if (utilidades.isEmpty(mensajeWarning)) {
                                                    mensajeWarning = "Aviso: \n ";
                                                }
                                                mensajeWarning += (j + " - " + informacionRetenciones.mensajeWarning[i] + "\n");
                                                j += 1;
                                            }
                                        }
                                        if (!utilidades.isEmpty(mensajeWarning)) {
                                            alert(mensajeWarning);
                                        }
                                        log.audit("calcularRetenciones", "LINE 772 - mensajeWarning: " + mensajeWarning);
                                    }

                                    log.audit("Governance Monitoring", "LINE 775 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                    //MUESTRO EL MENSAJE DE FINALIZACION
                                    alert(informacionRetenciones.mensajeOk);

                                } else {
                                    // MUESTRO EL ERROR
                                    var erroresCalculoRetenciones = "";
                                    if (informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length == 1) {
                                        erroresCalculoRetenciones = informacionRetenciones.mensajeError[0];
                                    }
                                    else {
                                        for (var i = 0; informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length; i++) {
                                            erroresCalculoRetenciones += informacionRetenciones.mensajeError[i] + ".\n";
                                        }
                                    }
                                    alert("ERROR EN EL PROCESO DE CALCULO DE RETENCIONES AUTOMATICO - DETALLES: " + "\n" + erroresCalculoRetenciones);
                                }
                            } else {
                                alert("ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA OBJECT NULA/VACIA");
                            }
                        } else {
                            alert("ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA OBJECT ARRAY NULA/VACIA");
                        }
                    } else {
                        alert("ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA JSON NULA/VACIA");
                    }
                }
            } catch (e) {
                log.error("calcularRetenciones", "CALCULARETENCIONES - Excepción Calcula Retenciones Cliente. Excepción: " + e.message);
                alert("Cliente: " + e.message);
                return false;
            }

            log.audit("Governance Monitoring", "LINE 805 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
            return true;

        }

        function cancelarRetenciones() {

            log.audit("cancelarRetenciones", "Inicio - Cancelar Retenciones");

            var recVendorPayment = currentRecord.get();

            //Inf Cabecera
            var recId = recVendorPayment.getValue({
                fieldId: "id"
            });

            if (!utilidades.isEmpty(recId)) {
                alert("Los importes de retención ya fueron calculados para este pago. Por favor verifique.");
                return false;
            }

            var cantidadRetenciones = recVendorPayment.getLineCount({ sublistId: "custpage_sublistretenciones" });
            log.debug("cancelarRetenciones", "LINE 830 - Log de control - Cantidad de retenciones: " + cantidadRetenciones);

            for (var i = cantidadRetenciones; i >= 0; i--) {

                var lineNum = recVendorPayment.selectLine({
                    sublistId: "custpage_sublistretenciones",
                    line: i
                });

                log.debug("cancelarRetenciones", "LINE 839 - Log de control - line num: " + lineNum);

                recVendorPayment.setCurrentSublistValue({
                    sublistId: "custpage_sublistretenciones",
                    fieldId: "custrecord_l54_ret_sistema_insertar",
                    value: true, //T
                    ignoreFieldChange: true
                });

                recVendorPayment.commitLine({ sublistId: "custpage_sublistretenciones" });
                recVendorPayment.removeLine({
                    sublistId: "custpage_sublistretenciones",
                    line: 0,
                    ignoreRecalc: false
                });
            }

            recVendorPayment.setValue({ fieldId: "custbody_l54_gan_imp_a_retener", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_suss_imp_a_retener", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_iva_imp_a_retener", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_iibb_imp_a_retener", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_municipal_imp_a_retener", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_importe_total_retencion", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_base_calculo_ret_gan", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_base_calculo_ret_suss", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_base_calculo_ret_iva", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_base_calculo_ret_iibb", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_importe_iva", value: 0.00 });
            recVendorPayment.setValue({ fieldId: "custbody_l54_importe_percepciones", value: 0.00 });

            alert("El proceso de cancelación de retenciones finalizo correctamente.");
            var cantidadRetenciones = recVendorPayment.getLineCount({ sublistId: "custpage_sublistretenciones" });
            log.debug("cancelarRetenciones", "LINE 867 - Log de control - Cantidad de retenciones: " + cantidadRetenciones);

            return true;
        }

        function parseDate(fecha, offsetInDays) {

            if (!utilidades.isEmpty(fecha)) {
                var parseDate = format.parse({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });

                if (isDate(parseDate) && !utilidades.isEmpty(offsetInDays) && offsetInDays != 0) {
                    parseDate = new Date(parseDate.setDate(parseDate.getDate() + offsetInDays)); //Se suma el offset en la fecha
                }

                return parseDate;
            }
        }

        //Convierte un Objeto Fecha JavaScript en un String con el formato del usuario actual
        function formatDate(fecha) {

            if (!utilidades.isEmpty(fecha)) {
                return format.format({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });
            }
        }

        //Identifica si una Fecha String es una fecha valida para ser convertida
        function isDate(fecha) {
            return fecha instanceof Date && !isNaN(fecha.valueOf());
        }

        return {
            calcularRetenciones: calcularRetenciones,
            cancelarRetenciones: cancelarRetenciones
        };
    });
