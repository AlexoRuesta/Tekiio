/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/error", "N/search", "N/format", "L54/utilidades", "N/ui/serverWidget", "N/file", "N/url", "N/https", "N/runtime", "N/config"],
    /* global define log */
    /* eslint-disable no-var */
    function (record, error, search, format, utilidades, serverWidget, file, url, https, runtime, config) {
        // debe estar primero, para que se ejecute, y genere la funcion que retorna y es utilizada
        var normalize = (function () {
            var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç°º",
                to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc  ",
                mapping = {};

            for (var i = 0, j = from.length; i < j; i++)
                mapping[from.charAt(i)] = to.charAt(i);

            return function (str) {
                var ret = [];
                for (var i = 0, j = str.length; i < j; i++) {
                    var c = str.charAt(i);
                    if (mapping.hasOwnProperty(str.charAt(i)))
                        ret.push(mapping[c]);
                    else
                        ret.push(c);
                }
                return ret.join("");
            };

        })();

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

            try {

                if (scriptContext.type == "create") {
                    log.audit("L54 - Calcular Retenciones (SS)", "INICIO - BEFORELOAD " + scriptContext.type);
                    var formVendorPayment = scriptContext.form;
                    var recordObj = scriptContext.newRecord;
                    var letraStr = "X";

                    var calRetAutomaticamente = false;
                    var subsidiaria = null;
                    var esOneWorld = utilidades.l54esOneworld();


                    log.audit("L54 - Calcular Retenciones (SS)", "BEFORELOAD " + scriptContext.type + " - CALCULAR RETENCIONES AUTOMATICAMENTE: " + calRetAutomaticamente);

                    //TIPO DE TRANSACCION STRING
                    var tipoTransStr = recordObj.type;

                    //ES NOTA DE DEBITO?
                    var esND = recordObj.getValue({
                        fieldId: "custbody_l54_nd"
                    });

                    if (utilidades.isEmpty(esND))
                        esND = false;

                    if (esOneWorld) {
                        //SUBSIDIARIA
                        subsidiaria = recordObj.getValue({
                            fieldId: "subsidiary"
                        });
                    }
                    var objDatosImpositivos = consultaDatosImpositivos(subsidiaria);
                    calRetAutomaticamente = objDatosImpositivos[0].calRetAutomaticamente;

                    //UBICACION
                    var location = recordObj.getValue({
                        fieldId: "location"
                    });

                    /*if (!calRetAutomaticamente)
                    {*/
                    //SE ASOCIA SCRIPT AL BOTON CON ESTRUCTURA SIMILAR A LA DE UN SCRIPT DE CLIENTE
                    formVendorPayment.clientScriptModulePath = "./L54 - Calcular Retenciones (Cliente).js";

                    formVendorPayment.addButton({
                        id: "custpage_calular_ret",
                        label: "Calcular Retenciones 2.0",
                        functionName: "calcularRetenciones"
                    });

                    formVendorPayment.addButton({
                        id: "custpage_cancelar_ret",
                        label: "Cancelar Retenciones 2.0",
                        functionName: "cancelarRetenciones"
                    });

                    //SE AGREGA TAB
                    formVendorPayment.addTab({
                        id: "custpage_tabretenciones",
                        label: "Calculo Retenciones 2.0"
                    });

                    //SE AGREGA SUBTAB
                    formVendorPayment.addSubtab({
                        id: "custpage_subtabretenciones",
                        label: "Calculo Retenciones 2.0",
                        tab: "custpage_tabretenciones"
                    });

                    //SE AGREGA SUBLISTA
                    var sublistRetenciones = formVendorPayment.addSublist({
                        id: "custpage_sublistretenciones",
                        type: serverWidget.SublistType.INLINEEDITOR,
                        label: "retenciones",
                        tab: "custpage_subtabretenciones"
                    });

                    //SUBLISTA - CAMPO RETENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_retencion",
                        label: "RETENCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customlist_l54_agentes_retencion"
                    }).updateDisplayType({
                        //displayType: serverWidget.FieldDisplayType.DISABLED
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO TIPO RETENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_tipo_ret",
                        label: "TIPO RETENCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_param_ret"
                    }).updateDisplayType({
                        //displayType: serverWidget.FieldDisplayType.DISABLED
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO TARIFA
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_tarifa",
                        label: "TARIFA (BASE CALCULO)",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO ALICUOTA
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_porcentaje",
                        label: "ALICUOTA",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        //displayType: serverWidget.FieldDisplayType.DISABLED
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO JURISDICCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_jurisdiccion",
                        label: "JURISDICCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_zona_impuestos"
                    }).updateDisplayType({
                        //displayType: serverWidget.FieldDisplayType.DISABLED
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO CONDICION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_condicion",
                        label: "CONDICION",
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        //displayType: serverWidget.FieldDisplayType.DISABLED
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO UNIDAD MEDIDA(BASE CALCULO).
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_unidad_medida",
                        label: "UNIDAD MEDIDA (BASE CALCULO)",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_um_fex"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO NETO BILL. APLIC.
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_net_bill",
                        label: "NETO BILL. APLIC",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO BASE DE CALCULO IMP
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_base_calculo_imp",
                        label: "BASE DE CALCULO IMP",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO IMPORTE A RETENER
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_imp_a_retener",
                        label: "IMP. A RETENER",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO TIPO CONTRIBUYENTE
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_id_tipo_contr",
                        label: "TIPO CONTRIBUYENTE",
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO TIPO EXENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_id_tipo_exen",
                        label: "TIPO EXENCION",
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO CERTIFICADO EXENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_cert_exen",
                        label: "CERTIFICADO EXENCION",
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO FECHA EXENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_fecha_exen",
                        label: "FECHA EXENCION",
                        type: serverWidget.FieldType.DATE
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO SISTEMA PERMITIR INSERTAR
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_sistema_insertar",
                        label: "PERMITIR INSERTAR",
                        type: serverWidget.FieldType.CHECKBOX
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO SISTEMA PERMITIR ELIMINAR
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_sistema_eliminar",
                        label: "PERMITIR ELIMINAR",
                        type: serverWidget.FieldType.CHECKBOX
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO BASE CALCULO
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_base_calculo",
                        label: "BASE CALCULO",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO L54 - DIFERENCIA POR REDONDEO
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_diferencia_redondeo",
                        label: "L54 - DIFERENCIA POR REDONDEO",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO L54 - IMPORTE RETENCIÓN ORIGINAL
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_importe_ret_original",
                        label: "L54 - IMPORTE RETENCIÓN ORIGINAL",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO L54 - BASE DE CÁLCULO ORIGINAL
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_base_calculo_original",
                        label: "L54 - BASE DE CÁLCULO ORIGINAL",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    //SUBLISTA - CAMPO L54 - MONTO SUJETO RETENCIÓN (MONEDA LOCAL)
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_monto_suj_ret_mon_loc",
                        label: "L54 - MONTO SUJETO RETENCIÓN (MONEDA LOCAL)",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    //}

                    //SE OBTIENE LA BOCA/PUNTO DE VENTA
                    var boca = obtenerPuntoVenta(esND, subsidiaria, tipoTransStr, location);

                    //SE OBTIENE LA LETRA
                    var letraId = getLetraId(letraStr);

                    log.debug("L54 - Calcular Retenciones (SS)", "ES ND?: " + esND + " - SUBSIDIARIA: " + subsidiaria + " - TIPOTRANSSTR: " + tipoTransStr + " - LOCATION: " + location + " - BOCA: " + boca + " - LETRAID: " + letraId);

                    //SE SETEA EL VALOR DE LA BOCA
                    recordObj.setValue({
                        fieldId: "custbody_l54_boca",
                        value: boca
                    });

                    //SE SETEA EL VALOR DE LA LETRA
                    recordObj.setValue({
                        fieldId: "custbody_l54_letra",
                        value: letraId
                    });
                }

                if (scriptContext.type == "view" || scriptContext.type == "edit") {
                    log.audit("L54 - Calcular Retenciones (SS)", "INICIO - BEFORELOAD " + scriptContext.type);
                    var formVendorPayment = scriptContext.form;
                    var objRecord = scriptContext.newRecord;
                    var recId = objRecord.id;
                    var recType = objRecord.type;
                    var arrayRetenciones = new Array();
                    arrayRetenciones = loadRetenciones(recId);

                    log.debug("L54 - Calcular Retenciones (SS)", "INFORMANCION RETENCIONES VINCULADAS AL PAGO: " + JSON.stringify(arrayRetenciones));

                    //SE AGREGA TAB
                    formVendorPayment.addTab({
                        id: "custpage_tabretenciones",
                        label: "Calculo Retenciones 2.0"
                    });

                    //SE AGREGA SUBTAB
                    formVendorPayment.addSubtab({
                        id: "custpage_subtabretenciones",
                        label: "Calculo Retenciones 2.0",
                        tab: "custpage_tabretenciones"
                    });

                    //SE AGREGA SUBLISTA
                    var sublistRetenciones = formVendorPayment.addSublist({
                        id: "custpage_sublistretenciones",
                        type: serverWidget.SublistType.INLINEEDITOR,
                        label: "retenciones",
                        tab: "custpage_subtabretenciones"
                    });

                    //SUBLISTA - ID RETENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_id_retencion",
                        label: "ID",
                        type: serverWidget.FieldType.TEXT,
                        source: "customlist_l54_agentes_retencion"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    //SUBLISTA - CAMPO RETENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_retencion",
                        label: "RETENCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customlist_l54_agentes_retencion"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO TIPO RETENCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_tipo_ret",
                        label: "TIPO RETENCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_param_ret"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO TARIFA
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_tarifa",
                        label: "TARIFA (BASE CALCULO)",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO ALICUOTA
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_porcentaje",
                        label: "ALICUOTA",
                        type: serverWidget.FieldType.FLOAT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO JURISDICCION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_jurisdiccion",
                        label: "JURISDICCION",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_zona_impuestos"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO CONDICION
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_condicion",
                        label: "CONDICION",
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                        //displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO UNIDAD MEDIDA(BASE CALCULO).
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_unidad_medida",
                        label: "UNIDAD MEDIDA(BASE CALCULO)",
                        type: serverWidget.FieldType.SELECT,
                        source: "customrecord_l54_um_fex"
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO NETO BILL. APLIC.
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_net_bill",
                        label: "NETO BILL. APLIC",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO BASE DE CALCULO IMP
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_base_calculo_imp",
                        label: "BASE DE CALCULO IMP",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO IMPORTE A RETENER
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_imp_a_retener",
                        label: "IMP. A RETENER",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    //SUBLISTA - CAMPO BASE CALCULO
                    sublistRetenciones.addField({
                        id: "custrecord_l54_ret_base_calculo",
                        label: "BASE CALCULO",
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.NORMAL
                    });

                    if (scriptContext.type == "edit") {
                        //SUBLISTA - CAMPO SISTEMA PERMITIR INSERTAR
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_sistema_insertar",
                            label: "PERMITIR INSERTAR",
                            type: serverWidget.FieldType.CHECKBOX
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });

                        //SUBLISTA - CAMPO SISTEMA PERMITIR ELIMINAR
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_sistema_eliminar",
                            label: "PERMITIR ELIMINAR",
                            type: serverWidget.FieldType.CHECKBOX
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });

                        //SUBLISTA - CAMPO TIPO CONTRIBUYENTE
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_id_tipo_contr",
                            label: "TIPO CONTRIBUYENTE",
                            type: serverWidget.FieldType.TEXT
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });

                        //SUBLISTA - CAMPO TIPO EXENCION
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_id_tipo_exen",
                            label: "TIPO EXENCION",
                            type: serverWidget.FieldType.TEXT
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });

                        //SUBLISTA - CAMPO CERTIFICADO EXENCION
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_cert_exen",
                            label: "CERTIFICADO EXENCION",
                            type: serverWidget.FieldType.TEXT
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });

                        //SUBLISTA - CAMPO FECHA EXENCION
                        sublistRetenciones.addField({
                            id: "custrecord_l54_ret_fecha_exen",
                            label: "FECHA EXENCION",
                            type: serverWidget.FieldType.DATE
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                    }

                    for (var i = 0; !utilidades.isEmpty(arrayRetenciones) && i < arrayRetenciones.length; i++) {
                        var lineNum = i;
                        sublistRetenciones.setSublistValue({ id: "custrecord_l54_id_retencion", line: lineNum, value: arrayRetenciones[i].ret_id_retencion });
                        sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_retencion", line: lineNum, value: arrayRetenciones[i].ret_tipo });
                        sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_porcentaje", line: lineNum, value: arrayRetenciones[i].ret_alicuota });
                        sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_tipo_ret", line: lineNum, value: arrayRetenciones[i].ret_retencion });
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_tarifa)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_tarifa", line: lineNum, value: arrayRetenciones[i].ret_tarifa });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_unidad_medida)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_unidad_medida", line: lineNum, value: arrayRetenciones[i].ret_unidad_medida });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_condicion)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_condicion", line: lineNum, value: arrayRetenciones[i].ret_condicion });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_neto_bill_aplicado)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_net_bill", line: lineNum, value: arrayRetenciones[i].ret_neto_bill_aplicado });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_base_calculo_imp)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: arrayRetenciones[i].ret_base_calculo_imp });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_importe)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_imp_a_retener", line: lineNum, value: arrayRetenciones[i].ret_importe });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_base_calculo)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_base_calculo", line: lineNum, value: arrayRetenciones[i].ret_base_calculo });
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_jurisdiccion)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_jurisdiccion", line: lineNum, value: arrayRetenciones[i].ret_jurisdiccion });
                        }
                        if ((arrayRetenciones[i].ret_tipo == 3 || arrayRetenciones[i].ret_tipo == 5 || arrayRetenciones[i].ret_tipo == 6) && !utilidades.isEmpty(arrayRetenciones[i].ret_tipo_contrib_iibb)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_id_tipo_contr", line: lineNum, value: arrayRetenciones[i].ret_tipo_contrib_iibb });
                        }
                        if (scriptContext.type == "edit") {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_sistema_insertar", line: lineNum, value: "T" });
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_sistema_eliminar", line: lineNum, value: "F" });

                            if (!utilidades.isEmpty(arrayRetenciones[i].ret_tipo_exencion))
                                sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_id_tipo_exen", line: lineNum, value: arrayRetenciones[i].ret_tipo_exencion });

                            if (!utilidades.isEmpty(arrayRetenciones[i].ret_cert_exencion))
                                sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_cert_exen", line: lineNum, value: arrayRetenciones[i].ret_cert_exencion });

                            var fechaExencion = arrayRetenciones[i].ret_fecha_exencion;

                            if (!utilidades.isEmpty(fechaExencion)) {
                                sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_fecha_exen", line: lineNum, value: fechaExencion });
                            }
                        }
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_base_calculo)) {
                            sublistRetenciones.setSublistValue({ id: "custrecord_l54_ret_base_calculo", line: lineNum, value: arrayRetenciones[i].ret_base_calculo });
                        }
                    }
                }
            }
            catch (e) {
                log.error("L54 - Calcular Retenciones (SS)", "ERROR EN EL EVENTO BEFORE LOAD - CONTEXTO: " + scriptContext.type + " - EXCEPCIÓN DETALLES: " + e.message);
            }
            log.audit("L54 - Calcular Retenciones (SS)", "FIN - BEFORELOAD " + scriptContext.type);
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            try {
                var script = runtime.getCurrentScript();
                var mensajeErrorRetencionAutomatica = "";
                var erroresCalculoRetenciones = "";
                var erroresCalculoRetencionesFacturaM = "";
                var arrayRetencionesCSV = [];

                log.audit("Governance Monitoring", "LINE 587 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                log.audit("L54 - Calcular Retenciones (SS)", "INICIO - BEFORESUBMIT " + scriptContext.type);

                if (scriptContext.type == "create") {
                    var objRecord = scriptContext.newRecord;
                    var recId = objRecord.id;
                    var calRetAutomaticamente = false;
                    //TIPO DE TRANSACCION STRING
                    var tipoTransStr = objRecord.type;
                    var subsidiaria = null;
                    var esOneWorld = utilidades.l54esOneworld();

                    if (esOneWorld) {
                        //SUBSIDIARIA
                        subsidiaria = objRecord.getValue({
                            fieldId: "subsidiary"
                        });
                    }

                    //ENTITY
                    var entity = objRecord.getValue({
                        fieldId: "entity"
                    });

                    //PERIODO CONTABLE
                    var id_posting_period = objRecord.getValue({
                        fieldId: "postingperiod"
                    });

                    //TIPO DE CAMBIO
                    var tasa_cambio_pago = objRecord.getValue({
                        fieldId: "exchangerate"
                    });

                    //MONEDA
                    var moneda = objRecord.getValue({
                        fieldId: "currency"
                    });

                    //TRANDATE
                    var fecha = objRecord.getValue({
                        fieldId: "trandate"
                    });

                    //log.error('beforesubmit', 'Fecha: ' + fecha);
                    var fechaAux = formatDate(fecha);
                    //log.error('beforesubmit', 'Fecha con función formatDate: ' + fechaAux);

                    //TOTAL
                    var total = objRecord.getValue({
                        fieldId: "total"
                    });

                    //Tipo Contribuyente
                    var tipoContribuyente = objRecord.getValue({
                        fieldId: "custbody_l54_tipo_contribuyente"
                    });

                    //DESACTIVAR CALCULO RETENCIONES AUTOMATICO
                    var desCalRetAuto = objRecord.getValue({
                        fieldId: "custbody_l54_desact_cal_ret_auto"
                    });

                    if (utilidades.isEmpty(desCalRetAuto))
                        desCalRetAuto = false;

                    //log.debug('LINE 608', 'desCalRetAuto: '+desCalRetAuto);
                    var objDatosImpositivos = consultaDatosImpositivos(subsidiaria);
                    var paramRetenciones = parametrizacionRetenciones(subsidiaria);

                    if (!utilidades.isEmpty(objDatosImpositivos)) {
                        calRetAutomaticamente = objDatosImpositivos[0].calRetAutomaticamente;
                        log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT CREATE - CALCULAR RETENCIONES AUTOMATICAMENTE: " + calRetAutomaticamente);

                        //SI ESTA ACTIVO EL TILDE DE CALCULAR RETENCIONES AUTOMATICAMENTE PERO A NIVEL DE FORMULARIO SE MARCA EL TILDE DE "DESACTIVAR CALCULO RETENCIONES AUTOMATICO"
                        //log.debug('LINE 617', 'calRetAutomaticamente: '+calRetAutomaticamente+' - desCalRetAuto: '+desCalRetAuto);
                        if (calRetAutomaticamente && desCalRetAuto) {
                            calRetAutomaticamente = false;
                        }
                        //log.debug('LINE 622', 'calRetAutomaticamente: '+calRetAutomaticamente);
                        //SI EN LA DATOS IMPOSITIVOS NO ESTA CONFIGURADO PARA EJECUTAR EL CALCULO DE RETENCIONES DE FORMA AUTOMATICA
                        if (!calRetAutomaticamente)//==FALSE
                        {
                            //SUBLISTA RETENCIONES 2.0
                            var cantidadRetenciones = objRecord.getLineCount({
                                sublistId: "custpage_sublistretenciones"
                            });

                            log.audit("Governance Monitoring", "LINE 669 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                            log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT CREATE - CANTIDAD DE ELEMENTOS EN SUBLISTA \"CALCULAR RETENCIONES 2.0\": " + cantidadRetenciones);

                            if (!utilidades.isEmpty(total) && total > 0.00 && cantidadRetenciones > 0) {
                                let importeTotalInym = 0.00;
                                for (var i = 0; i < cantidadRetenciones; i++) {
                                    var idTipoRetencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_retencion", line: i });
                                    var idRetencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_tipo_ret", line: i });
                                    var netoBillAplicados = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_net_bill", line: i });
                                    var baseCalculo = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_base_calculo", line: i });
                                    var baseCalculoImp = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_base_calculo_imp", line: i });
                                    var importeRetener = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_imp_a_retener", line: i });

                                    if (!utilidades.isEmpty(importeRetener) && !isNaN(importeRetener) && parseFloat(importeRetener, 10) > 0) {
                                        var condicion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_condicion", line: i });
                                        var jurisdiccion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_jurisdiccion", line: i });

                                        //NUEVO - ID DE TIPO CONTRIBUYENTE
                                        var idTipoContribuyente = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_id_tipo_contr", line: i });
                                        var alicuota = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_porcentaje", line: i });
                                        var idTipoExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_id_tipo_exen", line: i });
                                        var certificadoExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_cert_exen", line: i });
                                        var fechaExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_fecha_exen", line: i });
                                        //NUEVO - DATOS DE IMPORTES EARCIBA
                                        var diferenciaRedondeo = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: i });
                                        var importeRetencionOriginal = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_importe_ret_original", line: i });
                                        var baseCalculoRetOriginal = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_base_calculo_original", line: i });
                                        var montoSujRetMonedaLocal = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: i });
                                        //NUEVA LINEA
                                        var lineNum = i;

                                        if (idTipoRetencion == 6) {
                                            var tarifa = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_tarifa", line: i });
                                            var unidad = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_unidad_medida", line: i });
                                            importeTotalInym = parseFloat(importeTotalInym, 10) + parseFloat(importeRetener, 10);
                                            baseCalculo = baseCalculoImp;
                                            baseCalculoRetOriginal = baseCalculoImp;
                                            montoSujRetMonedaLocal = baseCalculoImp * tasa_cambio_pago;
                                            importeRetencionOriginal = importeRetener;
                                            
                                        }
                                        
                                        //SE SETEAN LOS CAMPOS
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: lineNum, value: idRetencion });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: lineNum, value: jurisdiccion });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: lineNum, value: importeRetener });
                                        var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                            return (obj.codigo == idRetencion);
                                        });

                                        if (!utilidades.isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                            var informacionRetencion = new Object();
                                            informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                            informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                            informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                        }
                                        else {
                                            var informacionRetencion = null;
                                        }

                                        if (!utilidades.isEmpty(informacionRetencion)) {
                                            objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_codigo_int", line: lineNum, value: informacionRetencion.codigo });
                                            objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: lineNum, value: informacionRetencion.tipo });
                                            objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_descrip_ret", line: lineNum, value: informacionRetencion.descripcion });
                                        }
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo", line: lineNum, value: baseCalculo });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: baseCalculoImp });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_proveedor", line: lineNum, value: entity });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: lineNum, value: false });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: lineNum, value: false });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_periodo", line: lineNum, value: id_posting_period });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: lineNum, value: netoBillAplicados });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_cambio", line: lineNum, value: tasa_cambio_pago });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_moneda", line: lineNum, value: moneda });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: lineNum, value: condicion });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha", line: lineNum, value: fecha });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: lineNum, value: diferenciaRedondeo });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe_ret_original", line: lineNum, value: importeRetencionOriginal });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_original", line: lineNum, value: baseCalculoRetOriginal });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: lineNum, value: montoSujRetMonedaLocal });

                                        if ((idTipoRetencion == 3 ||idTipoRetencion == 5 ||idTipoRetencion == 6) && !utilidades.isEmpty(idTipoContribuyente)) {
                                            objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_contrib_iibb", line: lineNum, value: idTipoContribuyente });
                                        }

                                        if (!utilidades.isEmpty(tarifa) && idTipoRetencion == 6) objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tarifa", line: lineNum, value: tarifa });

                                        if (!utilidades.isEmpty(unidad) && idTipoRetencion == 6) objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_unidad", line: lineNum, value: unidad });

                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: lineNum, value: alicuota });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_exencion", line: lineNum, value: idTipoExencion });
                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cert_exencion", line: lineNum, value: certificadoExencion });

                                        if (!utilidades.isEmpty(fechaExencion)) {
                                            var fechaExencionDate = format.parse({
                                                value: fechaExencion,
                                                type: format.Type.DATE
                                            });

                                            if (!utilidades.isEmpty(fechaExencionDate)) {
                                                var fechaExencionString = format.parse({
                                                    value: fechaExencionDate,
                                                    type: format.Type.DATE,
                                                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                                                });
                                                objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha_exencion", line: lineNum, value: fechaExencionString });
                                            }
                                        }
                                    }
                                }

                                if(parseFloat(importeTotalInym, 10) > 0){
                                    log.debug("Fuene Inym", importeTotalInym)
                                    var importeRetYnym = objRecord.getValue({ fieldId: "custbody_l54_inym_imp_a_retener" });
                                    if(parseFloat(importeTotalInym, 10) != parseFloat(importeRetYnym, 10)){
                                        var totalRetenciones = objRecord.getValue({ fieldId: "custbody_l54_importe_total_retencion" });
                                        var importeNeto = objRecord.getValue({ fieldId: "custbody_l54_importe_neto_a_abonar" });

                                        totalRetenciones = parseFloat(totalRetenciones, 10) - parseFloat(importeRetYnym, 10);
                                        totalRetenciones = parseFloat(totalRetenciones, 10) + parseFloat(importeTotalInym, 10);
                                        importeNeto = parseFloat(importeNeto, 10) + parseFloat(importeRetYnym, 10);
                                        importeNeto = parseFloat(importeNeto, 10) - parseFloat(importeTotalInym, 10);
                                        log.debug("Montos Inym", importeTotalInym + ' ->> ' + totalRetenciones + ' ->> ' + importeNeto)

                                        objRecord.setValue('custbody_l54_inym_imp_a_retener', importeTotalInym);
                                        objRecord.setValue('custbody_l54_importe_total_retencion', totalRetenciones);
                                        objRecord.setValue('custbody_l54_importe_neto_a_abonar', importeNeto);
                                    }
                                }

                            }
                        }

                        //SI EN LA DATOS IMPOSITIVOS ESTA CONFIGURADO PARA EJECUTAR EL CALCULO DE RETENCIONES DE FORMA AUTOMATICA
                        if (calRetAutomaticamente) {
                            //ARRAY INFORMACIÓN PAGO
                            fecha = (!utilidades.isEmpty(fecha)) ? fecha : "";
                            var infPago = new Object();
                            infPago.entity = entity;
                            infPago.periodo = id_posting_period;
                            infPago.tipoCambio = tasa_cambio_pago;
                            infPago.importeTotal = total;
                            infPago.trandate = [];
                            infPago.trandate.push(fecha);
                            infPago.fecha = [];
                            infPago.fecha.push(fechaAux);
                            infPago.moneda = moneda;
                            infPago.subsidiaria = subsidiaria;
                            infPago.tipoContribuyente = tipoContribuyente;
                            infPago.esOneWorld = utilidades.l54esOneworld();
                            infPago.facturas = new Array();
                            var arrayTranID = [];

                            var cantItems = objRecord.getLineCount({
                                sublistId: "apply"
                            });

                            if ((!utilidades.isEmpty(total)) && (total > 0.00)) {
                                for (var i = 0; !utilidades.isEmpty(cantItems) && i < cantItems; i++) {
                                    var fldApply = objRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: i });

                                    if (fldApply) {
                                        var id_vendorbill = objRecord.getSublistValue({ sublistId: "apply", fieldId: "doc", line: i });
                                        var amount = objRecord.getSublistValue({ sublistId: "apply", fieldId: "amount", line: i });
                                        var tranID = objRecord.getSublistValue({ sublistId: "apply", fieldId: "refnum", line: i });

                                        var objFactura = new Object();
                                        objFactura.idVendorBill = id_vendorbill;
                                        objFactura.linea = i;
                                        objFactura.amount = amount;
                                        infPago.facturas.push(objFactura);
                                        arrayTranID.push(tranID);
                                    }
                                }
                            }
                            log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - INFORMACION A PROCESAR: " + JSON.stringify(infPago));
                            log.audit("Governance Monitoring", "LINE 814 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                            if (!utilidades.isEmpty(infPago)) {
                                try {
                                    infPago.facturas = JSON.stringify(infPago.facturas);
                                    infPago.trandate = JSON.stringify(infPago.trandate);
                                    infPago.fecha = JSON.stringify(infPago.fecha);

                                    var new_url = url.resolveScript({
                                        scriptId: "customscript_l54_calcular_ret_suitelet",
                                        deploymentId: "customdeploy_l54_calcular_ret_suitelet",
                                        returnExternalUrl: true
                                    });

                                    log.audit("L54 - Calcular Retenciones (SS)", "infPago: " + JSON.stringify(infPago));

                                    var respuestaAux = https.post({
                                        url: new_url,
                                        body: infPago
                                    });

                                    log.audit("L54 - Calcular Retenciones (SS)", "LINE 832 - respuestaAux: " + JSON.stringify(respuestaAux));
                                    var importeTotalGanancias = 0.00;
                                    var importeTotalSUSS = 0.00;
                                    var importeTotalIVA = 0.00;
                                    var importeTotalIIBB = 0.00;
                                    var importeTotalMuni = 0.00;
                                    var importeTotalInym = 0.00;
                                    var cantidadRetenciones = 0;

                                    if (!utilidades.isEmpty(respuestaAux)) {

                                        var respuesta = JSON.parse(respuestaAux.body);

                                        log.audit("L54 - Calcular Retenciones (SS)", "LINE 844 - RESPUESTA: " + JSON.stringify(respuesta));

                                        if (!utilidades.isEmpty(respuesta) && respuesta.length > 0) {

                                            var informacionRetenciones = respuesta[0];

                                            log.audit("L54 - Calcular Retenciones (SS)", "LINE 849 - informacionRetenciones: " + JSON.stringify(informacionRetenciones));
                                            log.audit("L54 - Calcular Retenciones (SS)", "runtime.executionContext: " + runtime.executionContext);

                                            if (!utilidades.isEmpty(informacionRetenciones)) {

                                                if (informacionRetenciones.error == false) {
                                                    //RETENCION GANANCIAS
                                                    if (informacionRetenciones.esAgenteRetencionGan) {
                                                        if (informacionRetenciones.estaInscriptoRegimenGan) {
                                                            importeTotalGanancias = 0.00;

                                                            for (var i = 0; !utilidades.isEmpty(informacionRetenciones.retencion_ganancias) && i < informacionRetenciones.retencion_ganancias.length; i++) {
                                                                if (runtime.executionContext == "CSVIMPORT" || runtime.executionContext == "WEBSERVICES") {

                                                                    var retGuardada = guardarRetenciones(informacionRetenciones.retencion_ganancias[i], paramRetenciones, entity, id_posting_period, tasa_cambio_pago, moneda, fecha, false);

                                                                    if (!utilidades.isEmpty(retGuardada)) {
                                                                        var importeRetener = informacionRetenciones.retencion_ganancias[i].imp_retencion;
                                                                        importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);
                                                                        arrayRetencionesCSV.push(retGuardada);
                                                                    }
                                                                } else {

                                                                    var lineNum = 0;
                                                                    cantidadRetenciones = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                                                                    if (cantidadRetenciones == 0) {
                                                                        lineNum = 0;
                                                                    }
                                                                    else {
                                                                        lineNum = parseInt(cantidadRetenciones);
                                                                    }
                                                                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CANTIDAD ACTUAL DE RETENCIONES: " + cantidadRetenciones + " - BLOQUE GAN - LINENUM: " + lineNum);
                                                                    var alicuota = parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota, 10);
                                                                    var condicion = informacionRetenciones.retencion_ganancias[i].condicion;
                                                                    var idRetencion = informacionRetenciones.retencion_ganancias[i].tipo_ret;
                                                                    var baseCalculo = informacionRetenciones.retencion_ganancias[i].base_calculo;
                                                                    var baseCalculoImp = informacionRetenciones.retencion_ganancias[i].base_calculo_imp;
                                                                    var importeRetener = informacionRetenciones.retencion_ganancias[i].imp_retencion;
                                                                    // var paramRetenciones     = parametrizacionRetenciones(subsidiaria);
                                                                    var netoBillAplicados = informacionRetenciones.retencion_ganancias[i].neto_bill;
                                                                    var informacionRetencion = null;
                                                                    var diferenciaRedondeo = informacionRetenciones.retencion_ganancias[i].diferenciaRedondeo;
                                                                    var importeRetOriginal = informacionRetenciones.retencion_ganancias[i].imp_retencion_original;
                                                                    var baseCalculoOriginal = informacionRetenciones.retencion_ganancias[i].base_calculo_original;
                                                                    var montoSujRetMonedaLocal = informacionRetenciones.retencion_ganancias[i].monto_suj_ret_moneda_local;

                                                                    var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                        return (obj.codigo == idRetencion);
                                                                    });

                                                                    if (!utilidades.isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                        informacionRetencion = new Object();
                                                                        informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                        informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                        informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                    }

                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: lineNum, value: idRetencion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: lineNum, value: importeRetener });
                                                                    if (!utilidades.isEmpty(informacionRetencion)) {
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_codigo_int", line: lineNum, value: informacionRetencion.codigo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: lineNum, value: informacionRetencion.tipo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_descrip_ret", line: lineNum, value: informacionRetencion.descripcion });
                                                                    }
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo", line: lineNum, value: baseCalculo });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: baseCalculoImp });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_proveedor", line: lineNum, value: entity });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_periodo", line: lineNum, value: id_posting_period });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: lineNum, value: netoBillAplicados });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_cambio", line: lineNum, value: tasa_cambio_pago });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_moneda", line: lineNum, value: moneda });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: lineNum, value: condicion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha", line: lineNum, value: fecha });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: lineNum, value: alicuota });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_original", line: lineNum, value: baseCalculoOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: lineNum, value: montoSujRetMonedaLocal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe_ret_original", line: lineNum, value: importeRetOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: lineNum, value: diferenciaRedondeo });

                                                                    importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);
                                                                }
                                                            }

                                                            if (importeTotalGanancias > 0)
                                                                log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION GANANCIAS - IMPORTE TOTAL GANANCIAS: " + importeTotalGanancias);

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_gan_imp_a_retener",
                                                                value: importeTotalGanancias,
                                                                ignoreFieldChange: false
                                                            });
                                                        }
                                                    }//FIN - RETENCION GANANCIAS


                                                    //INICIO - RETENCION SUSS
                                                    if (informacionRetenciones.esAgenteRetencionSUSS) {
                                                        if (informacionRetenciones.estaInscriptoRegimenSUSS) {
                                                            importeTotalSUSS = 0.00;

                                                            for (var i = 0; !utilidades.isEmpty(informacionRetenciones.retencion_suss) && i < informacionRetenciones.retencion_suss.length; i++) {

                                                                if (runtime.executionContext == "CSVIMPORT" || runtime.executionContext == "WEBSERVICES") {

                                                                    var retGuardada = guardarRetenciones(informacionRetenciones.retencion_suss[i], paramRetenciones, entity, id_posting_period, tasa_cambio_pago, moneda, fecha, false);

                                                                    if (!utilidades.isEmpty(retGuardada)) {
                                                                        var importeRetener = informacionRetenciones.retencion_suss[i].imp_retencion;
                                                                        importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);
                                                                        arrayRetencionesCSV.push(retGuardada);
                                                                    }
                                                                } else {

                                                                    var lineNum = 0;
                                                                    cantidadRetenciones = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                                                                    if (cantidadRetenciones == 0) {
                                                                        lineNum = 0;
                                                                    }
                                                                    else {
                                                                        lineNum = parseInt(cantidadRetenciones);
                                                                    }
                                                                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CANTIDAD ACTUAL DE RETENCIONES: " + cantidadRetenciones + " - BLOQUE SUSS - LINENUM: " + lineNum);
                                                                    var alicuota = parseFloat(informacionRetenciones.retencion_suss[i].alicuota, 10);
                                                                    var condicion = informacionRetenciones.retencion_suss[i].condicion;
                                                                    var idRetencion = informacionRetenciones.retencion_suss[i].tipo_ret;
                                                                    var baseCalculo = informacionRetenciones.retencion_suss[i].base_calculo;
                                                                    var baseCalculoImp = informacionRetenciones.retencion_suss[i].base_calculo_imp;
                                                                    var importeRetener = informacionRetenciones.retencion_suss[i].imp_retencion;
                                                                    // var paramRetenciones     = parametrizacionRetenciones(subsidiaria);
                                                                    var netoBillAplicados = informacionRetenciones.retencion_suss[i].neto_bill;
                                                                    var informacionRetencion = null;
                                                                    var diferenciaRedondeo = informacionRetenciones.retencion_suss[i].diferenciaRedondeo;
                                                                    var importeRetOriginal = informacionRetenciones.retencion_suss[i].imp_retencion_original;
                                                                    var baseCalculoOriginal = informacionRetenciones.retencion_suss[i].base_calculo_original;
                                                                    var montoSujRetMonedaLocal = informacionRetenciones.retencion_suss[i].monto_suj_ret_moneda_local;

                                                                    var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                        return (obj.codigo == idRetencion);
                                                                    });

                                                                    if (!utilidades.isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                        informacionRetencion = new Object();
                                                                        informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                        informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                        informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                    }

                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: lineNum, value: idRetencion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: lineNum, value: importeRetener });
                                                                    if (!utilidades.isEmpty(informacionRetencion)) {
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_codigo_int", line: lineNum, value: informacionRetencion.codigo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: lineNum, value: informacionRetencion.tipo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_descrip_ret", line: lineNum, value: informacionRetencion.descripcion });
                                                                    }
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo", line: lineNum, value: baseCalculo });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: baseCalculoImp });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_proveedor", line: lineNum, value: entity });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_periodo", line: lineNum, value: id_posting_period });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: lineNum, value: netoBillAplicados });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_cambio", line: lineNum, value: tasa_cambio_pago });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_moneda", line: lineNum, value: moneda });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: lineNum, value: condicion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha", line: lineNum, value: fecha });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: lineNum, value: alicuota });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_original", line: lineNum, value: baseCalculoOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: lineNum, value: montoSujRetMonedaLocal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe_ret_original", line: lineNum, value: importeRetOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: lineNum, value: diferenciaRedondeo });

                                                                    importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);
                                                                }
                                                            }

                                                            if (importeTotalSUSS > 0)
                                                                log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION SUSS - IMPORTE TOTAL SUSS: " + importeTotalSUSS);

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_suss_imp_a_retener",
                                                                value: importeTotalSUSS,
                                                                ignoreFieldChange: false
                                                            });
                                                        }
                                                    }//FIN - RETENCION SUSS


                                                    //INICIO - RETENCION IVA
                                                    if (informacionRetenciones.esAgenteRetencionIVA) {
                                                        if (informacionRetenciones.estaInscriptoRegimenIVA) {
                                                            importeTotalIVA = 0.00;

                                                            for (var i = 0; !utilidades.isEmpty(informacionRetenciones.retencion_iva) && i < informacionRetenciones.retencion_iva.length; i++) {
                                                                if (runtime.executionContext == "CSVIMPORT" || runtime.executionContext == "WEBSERVICES") {

                                                                    var retGuardada = guardarRetenciones(informacionRetenciones.retencion_iva[i], paramRetenciones, entity, id_posting_period, tasa_cambio_pago, moneda, fecha, false);

                                                                    if (!utilidades.isEmpty(retGuardada)) {
                                                                        var importeRetener = informacionRetenciones.retencion_iva[i].imp_retencion;
                                                                        importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);
                                                                        arrayRetencionesCSV.push(retGuardada);
                                                                    }
                                                                } else {
                                                                    var lineNum = 0;
                                                                    cantidadRetenciones = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                                                                    if (cantidadRetenciones == 0) {
                                                                        lineNum = 0;
                                                                    }
                                                                    else {
                                                                        lineNum = parseInt(cantidadRetenciones);
                                                                    }
                                                                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CANTIDAD ACTUAL DE RETENCIONES: " + cantidadRetenciones + " - BLOQUE IVA - LINENUM: " + lineNum);
                                                                    var alicuota = parseFloat(informacionRetenciones.retencion_iva[i].alicuota, 10);
                                                                    var condicion = informacionRetenciones.retencion_iva[i].condicion;
                                                                    var idRetencion = informacionRetenciones.retencion_iva[i].tipo_ret;
                                                                    var baseCalculo = informacionRetenciones.retencion_iva[i].base_calculo;
                                                                    var baseCalculoImp = informacionRetenciones.retencion_iva[i].base_calculo_imp;
                                                                    var importeRetener = informacionRetenciones.retencion_iva[i].imp_retencion;
                                                                    // var paramRetenciones     = parametrizacionRetenciones(subsidiaria);
                                                                    var netoBillAplicados = informacionRetenciones.retencion_iva[i].neto_bill;
                                                                    var informacionRetencion = null;
                                                                    var diferenciaRedondeo = informacionRetenciones.retencion_iva[i].diferenciaRedondeo;
                                                                    var importeRetOriginal = informacionRetenciones.retencion_iva[i].imp_retencion_original;
                                                                    var baseCalculoOriginal = informacionRetenciones.retencion_iva[i].base_calculo_original;
                                                                    var montoSujRetMonedaLocal = informacionRetenciones.retencion_iva[i].monto_suj_ret_moneda_local;

                                                                    var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                        return (obj.codigo == idRetencion);
                                                                    });

                                                                    if (!utilidades.isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                        informacionRetencion = new Object();
                                                                        informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                        informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                        informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                    }

                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: lineNum, value: idRetencion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: lineNum, value: importeRetener });
                                                                    if (!utilidades.isEmpty(informacionRetencion)) {
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_codigo_int", line: lineNum, value: informacionRetencion.codigo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: lineNum, value: informacionRetencion.tipo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_descrip_ret", line: lineNum, value: informacionRetencion.descripcion });
                                                                    }
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo", line: lineNum, value: baseCalculo });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: baseCalculoImp });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_proveedor", line: lineNum, value: entity });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_periodo", line: lineNum, value: id_posting_period });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: lineNum, value: netoBillAplicados });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_cambio", line: lineNum, value: tasa_cambio_pago });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_moneda", line: lineNum, value: moneda });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: lineNum, value: condicion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha", line: lineNum, value: fecha });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: lineNum, value: alicuota });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_original", line: lineNum, value: baseCalculoOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: lineNum, value: montoSujRetMonedaLocal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe_ret_original", line: lineNum, value: importeRetOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: lineNum, value: diferenciaRedondeo });

                                                                    importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);
                                                                }
                                                            }
                                                            if (importeTotalIVA > 0)
                                                                log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION IVA - IMPORTE TOTAL IVA: " + importeTotalIVA);

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_iva_imp_a_retener",
                                                                value: importeTotalIVA,
                                                                ignoreFieldChange: false
                                                            });

                                                        }
                                                    }//FIN - RETENCION IVA


                                                    //INICIO - RETENCION IIBB
                                                    if (informacionRetenciones.esAgenteRetencionIIBB) {
                                                        if (informacionRetenciones.estaInscriptoRegimenIIBB) {
                                                            importeTotalIIBB = 0.00;
                                                            importeTotalMuni = 0.00;
                                                            importeTotalInym = 0.00;

                                                            for (var i = 0; !utilidades.isEmpty(informacionRetenciones.retencion_iibb) && i < informacionRetenciones.retencion_iibb.length; i++) {
                                                                if (runtime.executionContext == "CSVIMPORT" || runtime.executionContext == "WEBSERVICES") {

                                                                    var retGuardada = guardarRetenciones(informacionRetenciones.retencion_iibb[i], paramRetenciones, entity, id_posting_period, tasa_cambio_pago, moneda, fecha, true);

                                                                    if (!utilidades.isEmpty(retGuardada)) {
                                                                        var importeRetener = informacionRetenciones.retencion_iibb[i].imp_retencion;
                                                                        
                                                                        if(informacionRetenciones.retencion_iibb[i].retencion == 5){
                                                                            importeTotalMuni = parseFloat(importeTotalMuni, 10) + parseFloat(importeRetener, 10);
                                                                        }else if(informacionRetenciones.retencion_iibb[i].retencion == 6){
                                                                            importeTotalInym = parseFloat(importeTotalInym, 10) + parseFloat(importeRetener, 10);
                                                                        }else{
                                                                            importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);
                                                                        }
                                                                        
                                                                        arrayRetencionesCSV.push(retGuardada);
                                                                    }
                                                                } else {
                                                                    var lineNum = 0;
                                                                    cantidadRetenciones = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                                                                    if (cantidadRetenciones == 0) {
                                                                        lineNum = 0;
                                                                    }
                                                                    else {
                                                                        lineNum = parseInt(cantidadRetenciones);
                                                                    }
                                                                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CANTIDAD ACTUAL DE RETENCIONES: " + cantidadRetenciones + " - BLOQUE IIBB - LINENUM: " + lineNum);
                                                                    var alicuota = parseFloat(informacionRetenciones.retencion_iibb[i].alicuota, 10);
                                                                    var condicion = informacionRetenciones.retencion_iibb[i].condicion;
                                                                    var idRetencion = informacionRetenciones.retencion_iibb[i].tipo_ret;
                                                                    var baseCalculo = informacionRetenciones.retencion_iibb[i].base_calculo;
                                                                    var jurisdiccion = informacionRetenciones.retencion_iibb[i].jurisdiccion;
                                                                    var baseCalculoImp = informacionRetenciones.retencion_iibb[i].base_calculo_imp;
                                                                    var importeRetener = informacionRetenciones.retencion_iibb[i].imp_retencion;
                                                                    // var paramRetenciones     = parametrizacionRetenciones(subsidiaria);
                                                                    var idTipoRetencion = informacionRetenciones.retencion_iibb[i].retencion;
                                                                    var netoBillAplicados = informacionRetenciones.retencion_iibb[i].neto_bill;
                                                                    var informacionRetencion = null;
                                                                    var idTipoContribuyente = informacionRetenciones.retencion_iibb[i].condicionID;
                                                                    var idTipoExencion = informacionRetenciones.retencion_iibb[i].tipoExencion;
                                                                    var certificadoExencion = informacionRetenciones.retencion_iibb[i].certExencion;
                                                                    var fechaExencion = informacionRetenciones.retencion_iibb[i].fcaducidadExencion;
                                                                    var diferenciaRedondeo = informacionRetenciones.retencion_iibb[i].diferenciaRedondeo;
                                                                    var importeRetOriginal = informacionRetenciones.retencion_iibb[i].imp_retencion_original;
                                                                    var baseCalculoOriginal = informacionRetenciones.retencion_iibb[i].base_calculo_original;
                                                                    var montoSujRetMonedaLocal = informacionRetenciones.retencion_iibb[i].monto_suj_ret_moneda_local;
                                                                    var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                        return (obj.codigo == idRetencion);
                                                                    });

                                                                    if (!utilidades.isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                        informacionRetencion = new Object();
                                                                        informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                        informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                        informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                    }
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: lineNum, value: idRetencion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: lineNum, value: jurisdiccion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: lineNum, value: importeRetener });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe_ret_original", line: lineNum, value: importeRetOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_diferencia_redondeo", line: lineNum, value: diferenciaRedondeo });
                                                                    if (!utilidades.isEmpty(informacionRetencion)) {
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_codigo_int", line: lineNum, value: informacionRetencion.codigo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: lineNum, value: informacionRetencion.tipo });
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_descrip_ret", line: lineNum, value: informacionRetencion.descripcion });
                                                                    }
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo", line: lineNum, value: baseCalculo });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_original", line: lineNum, value: baseCalculoOriginal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_monto_suj_ret_mon_loc", line: lineNum, value: montoSujRetMonedaLocal });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: lineNum, value: baseCalculoImp });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_proveedor", line: lineNum, value: entity });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: lineNum, value: false });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_periodo", line: lineNum, value: id_posting_period });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: lineNum, value: netoBillAplicados });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_cambio", line: lineNum, value: tasa_cambio_pago });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_moneda", line: lineNum, value: moneda });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: lineNum, value: condicion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha", line: lineNum, value: fecha });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: lineNum, value: alicuota });
                                                                    
                                                                    if ((idTipoRetencion == 3 || idTipoRetencion == 5 || idTipoRetencion == 6) && !utilidades.isEmpty(idTipoContribuyente)) {
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_contrib_iibb", line: lineNum, value: idTipoContribuyente });
                                                                    }

                                                                    if (!utilidades.isEmpty(tarifa) && idTipoRetencion == 6) objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tarifa", line: lineNum, value: tarifa });

                                                                    if (!utilidades.isEmpty(unidad) && idTipoRetencion == 6) objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_unidad", line: lineNum, value: unidad });

                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_exencion", line: lineNum, value: idTipoExencion });
                                                                    objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cert_exencion", line: lineNum, value: certificadoExencion });
                                                                    if (!utilidades.isEmpty(fechaExencion)) {
                                                                        //log.error('beforeSubmit', 'fechaExencion: ' + fechaExencion);
                                                                        fechaExencion = new Date(fechaExencion);
                                                                        //log.error('beforeSubmit', 'fechaExencion con new Date: ' + fechaExencion);
                                                                        var fechaExencionString = format.parse({
                                                                            value: fechaExencion,
                                                                            type: format.Type.DATE,
                                                                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                                                                        });
                                                                        //log.error('beforeSubmit', 'fechaExencionString: ' + fechaExencionString);
                                                                        objRecord.setSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha_exencion", line: lineNum, value: fechaExencionString });
                                                                    }

                                                                    if(informacionRetenciones.retencion_iibb[i].retencion == 5){
                                                                        importeTotalMuni = parseFloat(importeTotalMuni, 10) + parseFloat(importeRetener, 10);
                                                                    }else if(informacionRetenciones.retencion_iibb[i].retencion == 6){
                                                                        importeTotalInym = parseFloat(importeTotalInym, 10) + parseFloat(importeRetener, 10);
                                                                    }else{
                                                                        importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);
                                                                    }
                                                                }
                                                            }

                                                            if (importeTotalIIBB > 0)
                                                                log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION INGRESOS BRUTOS - IMPORTE TOTAL INGRESOS BRUTOS: " + importeTotalIIBB);

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_iibb_imp_a_retener",
                                                                value: importeTotalIIBB,
                                                                ignoreFieldChange: false
                                                            });

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_municipal_imp_a_retener",
                                                                value: importeTotalMuni,
                                                                ignoreFieldChange: false
                                                            });

                                                            objRecord.setValue({
                                                                fieldId: "custbody_l54_inym_imp_a_retener",
                                                                value: importeTotalInym,
                                                                ignoreFieldChange: false
                                                            });

                                                        }
                                                    }//FIN - RETENCION IIBB

                                                    var importeTotalRetencion = parseFloat(importeTotalGanancias, 10) + parseFloat(importeTotalIVA, 10) + parseFloat(importeTotalIIBB, 10) + parseFloat(importeTotalMuni, 10) + parseFloat(importeTotalInym, 10) + parseFloat(importeTotalSUSS, 10);
                                                    var total = objRecord.getValue({ fieldId: "total" });
                                                    var importeNetoAbonar = parseFloat(total, 10) - parseFloat(importeTotalRetencion, 10);

                                                    if (importeTotalRetencion > 0)
                                                        log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION DE RETENCIONES - IMPORTE TOTAL: " + importeTotalRetencion);

                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_importe_neto_a_abonar",
                                                        value: importeNetoAbonar,
                                                        ignoreFieldChange: false
                                                    });

                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_neto_bill_aplicados",
                                                        value: informacionRetenciones.neto_bill_aplicados,
                                                        ignoreFieldChange: false
                                                    });

                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_importe_total_retencion",
                                                        value: importeTotalRetencion,
                                                        ignoreFieldChange: false
                                                    });

                                                    //PARA TXT DE RETENCIONES
                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_importe_iva",
                                                        value: informacionRetenciones.importe_iva,
                                                        ignoreFieldChange: false
                                                    });

                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_importe_percepciones",
                                                        value: informacionRetenciones.importe_percepciones,
                                                        ignoreFieldChange: false
                                                    });

                                                    objRecord.setValue({
                                                        fieldId: "custbody_l54_version_calc_ret",
                                                        value: informacionRetenciones.version_calc_ret,
                                                        ignoreFieldChange: false
                                                    });
                                                }
                                                else {
                                                    //SE MUESTRA EL ERROR
                                                    //if (!utilidades.isEmpty(informacionRetenciones.mensajeError) && i < informacionRetenciones.mensajeError.length == 1) {
                                                    if (!utilidades.isEmpty(informacionRetenciones.mensajeError) && informacionRetenciones.mensajeError.length == 1) {
                                                        erroresCalculoRetenciones = informacionRetenciones.mensajeError[0];
                                                    }
                                                    else {
                                                        for (var i = 0; informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length; i++) {
                                                            erroresCalculoRetenciones += informacionRetenciones.mensajeError[i] + " / ";
                                                        }
                                                    }
                                                    log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR EN EL PROCESO DE CALCULO DE RETENCIONES AUTOMATICO - DETALLES: " + erroresCalculoRetenciones);
                                                    if (!utilidades.isEmpty(informacionRetenciones.errorFacturaM) && informacionRetenciones.errorFacturaM) {
                                                        erroresCalculoRetencionesFacturaM = "Error en el proceso de Cálculo de Retenciones Automático - Detalles: Solo es Posible realizar Pagos Totales de Facturas M";
                                                        throw erroresCalculoRetencionesFacturaM;
                                                    }
                                                }
                                            } else {
                                                log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA OBJECT NULA/VACIA");
                                            }
                                        } else {
                                            log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA OBJECT ARRAY NULA/VACIA");
                                        }
                                    } else {
                                        log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR OBTENIENDO INFORMACION DE CALCULO DE RETENCIONES AUTOMATICO - RESPUESTA JSON NULA/VACIA");
                                    }
                                }
                                catch (e) {
                                    log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR MIENTRAS SE CALCULABAN LAS RETENCIONES DE FORMA AUTOMATICA - EXCEPCION DETALLES: " + e.message);
                                    log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT - ERROR MIENTRAS SE CALCULABAN LAS RETENCIONES DE FORMA AUTOMATICA - EXCEPCION DETALLES COMPLETO: " + JSON.stringify(e));

                                    if (!utilidades.isEmpty(arrayRetencionesCSV) && arrayRetencionesCSV.length > 0) {
                                        eliminarRetencionesCSV(arrayRetencionesCSV);
                                    }

                                    arrayRetencionesCSV = null;

                                    if (e.type.toString() == "error.SuiteScriptError" && e.name.toString() == "SSS_REQUEST_TIME_EXCEEDED") {
                                        log.error("L54 - Calcular Retenciones (SS)", "Ingreso a capture de error con SSS_REQUEST_TIME_EXCEEDED");
                                        mensajeErrorRetencionAutomatica = "Error: El cálculo de retenciones para las facturas: " + arrayTranID.toString() + "; ha excedido el límite de tiempo para devolver una respuesta. Intente repetir el proceso nuevamente.";
                                        log.error("L54 - Calcular Retenciones (SS)", "mensajeErrorRetencionAutomatica: " + mensajeErrorRetencionAutomatica);
                                        throw mensajeErrorRetencionAutomatica;
                                    }
                                }
                            }
                        }

                         /** Modificación 16-01 Clearing Account */
                            var accountOri = objRecord.getValue({ fieldId: "account" });
                            var cantLinRet = objRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_ret_ref_pago_prov' });
                            var paramFormaPago = runtime.getCurrentScript().getParameter({ name: "custscript_l54_calcular_ret_ss_form" });
                            var formaPago= objRecord.getValue({ fieldId: "custbody_3k_forma_pago_local" });
                          
                            var cuentaClearing = '';
                            if (objDatosImpositivos[0].applyAccountClearing && paramFormaPago != formaPago && cantLinRet > 0) { // si se aplica clearing
                                cuentaClearing = obtenerConfRetCtaClearing(
                                    objRecord.getValue({
                                        fieldId: "subsidiary"
                                    }), 
                                    objRecord.getValue({
                                        fieldId: "currency"
                                    }),
                                    accountOri
                                );
                                objRecord.setValue('account', cuentaClearing);
                                objRecord.setValue('custbody_l54_cuenta_banco', accountOri);
                                
                                log.debug("Governance Monitoring", "Memoria = " + script.getRemainingUsage());
                            }
                        
                    }

                    if (!utilidades.isEmpty(arrayRetencionesCSV) && arrayRetencionesCSV.length > 0) {
                        objRecord.setValue({
                            fieldId: "custbody_l54_id_retenciones_csv",
                            value: JSON.stringify(arrayRetencionesCSV),
                            ignoreFieldChange: false
                        });
                    }
                    log.audit("L54 - Calcular Retenciones (SS)", "FIN - BEFORESUBMIT " + scriptContext.type);
                   
                    
                }

                if (scriptContext.type == "delete") {
                    log.audit("L54 - Calcular Retenciones (SS)", "INICIO - BEFORESUBMIT " + scriptContext.type);
                    var objRecord = scriptContext.oldRecord;
                    var jeAsociado = objRecord.getValue({
                        fieldId: "custbody_l54_id_je_vendorpayment"
                    });

                    var numLocalizado = objRecord.getValue({
                        fieldId: "custbody_l54_numero_localizado"
                    });
                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT DELETE - JOURNALENTRY ASOCIADO: " + jeAsociado);
                    if (!utilidades.isEmpty(jeAsociado)) {
                        try {
                            var jeDelete = record.delete({
                                type: record.Type.JOURNAL_ENTRY,
                                id: jeAsociado
                            });

                            log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT DELETE - SE ELIMINO EL JOURNALENTRY EXITOSAMENTE. ID JOURNALENTRY ELIMINADO: " + jeAsociado);
                        }
                        catch (e) {
                            log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT DELETE - ERROR ELIMINANDO JOURNALENTRY. EXCEPCION DETALLES: " + e.message);
                        }
                    }

                    //SE ELIMINAN LAS RETENCIONES VINCULADAS AL PAG (SE MARCAN COMO ELIMINADAS)
                    var cantidadRetenciones = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                    var arrayRetenciones = new Array();

                    for (var i = 0; !utilidades.isEmpty(cantidadRetenciones) && i < cantidadRetenciones; i++) {
                        var objRetenciones = new Object();
                        objRetenciones.ret_retencion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "id", line: i });
                        arrayRetenciones.push(objRetenciones);
                    }
                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT DELETE - ARRAYRETENCIONES A ELIMINAR: " + JSON.stringify(arrayRetenciones));


                    for (var i = 0; !utilidades.isEmpty(arrayRetenciones) && i < arrayRetenciones.length; i++) {
                        if (!utilidades.isEmpty(arrayRetenciones[i].ret_retencion) && arrayRetenciones[i].ret_retencion > 0) {
                            try {

                                var recordRetencion = record.load({
                                    type: "customrecord_l54_retencion",
                                    id: arrayRetenciones[i].ret_retencion,
                                    isDynamic: true,
                                });

                                var nombrePagoProveedor = recordRetencion.getText({
                                    fieldId: "custrecord_l54_ret_ref_pago_prov"
                                });
                                recordRetencion.setValue({ fieldId: "custrecord_l54_ret_eliminado", value: true });
                                recordRetencion.setValue({ fieldId: "custrecord_l54_ret_ref_pago_eliminado", value: nombrePagoProveedor });

                                var idRR = recordRetencion.save({
                                    enableSourcing: true,
                                    ignoreMandatoryFields: false
                                });
                            }
                            catch (e) {
                                log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT DELETE - ERROR ELIMINANDO LAS RETENCIONES VINCULADAS AL PAGO. RETENCION DE PAGO: " + numLocalizado + " - ID INTERNO RETENCION: " + arrayRetenciones[i].ret_retencion + ". EXCEPCION DETALLES:" + e.message);
                            }
                        }
                    }
                    log.audit("L54 - Calcular Retenciones (SS)", "FIN - BEFORESUBMIT DELETE");
                }

                if (scriptContext.type == "edit") {
                    log.audit("L54 - Calcular Retenciones (SS)", "INICIO - BEFORESUBMIT " + scriptContext.type);
                    var objRecord = scriptContext.newRecord;
                    var idPagoProveedor = objRecord.id;
                    var cantidadRetRecmach = objRecord.getLineCount({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                    var arrayRetenciones = new Array();

                    for (var i = 0; !utilidades.isEmpty(cantidadRetRecmach) && i < cantidadRetRecmach; i++) {
                        var objRetenciones = new Object();
                        objRetenciones.idInternoRet = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "id", line: i });
                        objRetenciones.ret_tipo = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: i });
                        objRetenciones.ret_retencion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_retencion", line: i });
                        objRetenciones.ret_ref_pago = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_ref_pago_prov", line: i });
                        objRetenciones.ret_anulado = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_anulado", line: i });
                        objRetenciones.ret_eliminado = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_eliminado", line: i });
                        objRetenciones.ret_jurisdiccion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: i });
                        objRetenciones.ret_importe = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: i });
                        objRetenciones.ret_base_calculo_imp = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_base_calculo_imp", line: i });
                        objRetenciones.ret_neto_bill_aplicado = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_neto_bill_aplicado", line: i });
                        objRetenciones.ret_condicion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_condicion", line: i });
                        objRetenciones.ret_tipo_contrib_iibb = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_contrib_iibb", line: i });
                        objRetenciones.ret_alicuota = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_alicuota", line: i });
                        objRetenciones.ret_tipo_exencion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo_exencion", line: i });
                        objRetenciones.ret_cert_exencion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cert_exencion", line: i });
                        objRetenciones.ret_fecha_exencion = objRecord.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_fecha_exencion", line: i });
                        arrayRetenciones.push(objRetenciones);
                    }

                    log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT EDIT - CANTIDAD DE RETENCIONES EN SUBLISTA \"RETENCIONES\": " + cantidadRetRecmach + " - DETALLE: " + JSON.stringify(arrayRetenciones));

                    var cantidadRetenciones = objRecord.getLineCount({ sublistId: "custpage_sublistretenciones" });
                    var importeTotalGanancias = 0.00;
                    var importeTotalIVA = 0.00;
                    var importeTotalIIBB = 0.00;
                    var importeTotalMuni = 0.00;
                    var importeTotalInym = 0.00;
                    var importeTotalSUSS = 0.00;

                    for (var i = 0; i < cantidadRetenciones; i++) {
                        var idInternoRet = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_id_retencion", line: i });
                        var idTipoRetencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_retencion", line: i });
                        var idRetencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_tipo_ret", line: i });
                        var netoBillAplicados = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_net_bill", line: i });
                        var baseCalculo = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_base_calculo", line: i });
                        var baseCalculoImp = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_base_calculo_imp", line: i });
                        var importeRetener = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_imp_a_retener", line: i });
                        var jurisdiccion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_jurisdiccion", line: i });
                        var idTipoContribuyente = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_id_tipo_contr", line: i });
                        var alicuota = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_porcentaje", line: i });
                        var idTipoExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_id_tipo_exen", line: i });
                        var certificadoExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_cert_exen", line: i });
                        var fechaExencion = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_fecha_exen", line: i });
                        log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT EDIT - CANTIDAD DE RETENCIONES EN SUBLISTA \"CALCULO RETENCIONES 2.0\": " + cantidadRetenciones + " - INDICE: " + i + " - ID INTERNO RETENCION: " + idInternoRet);

                        if (idTipoRetencion == 1)//GANANCIAS
                        {
                            importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);
                        }
                        if (idTipoRetencion == 2)//IVA
                        {
                            importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);
                        }
                        if (idTipoRetencion == 3)//INGRESOS BRUTOS
                        {
                            importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);
                        }
                        if (idTipoRetencion == 4)//SUSS
                        {
                            importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);
                        }
                        if (idTipoRetencion == 5)//MUNICIPAL
                        {
                            importeTotalMuni = parseFloat(importeTotalMuni, 10) + parseFloat(importeRetener, 10);
                        }
                        if(idTipoRetencion == 6)//INYM
                        {
                            var tarifa = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_tarifa", line: i });
                            var unidad = objRecord.getSublistValue({ sublistId: "custpage_sublistretenciones", fieldId: "custrecord_l54_ret_unidad_medida", line: i });
                            importeTotalInym = parseFloat(importeTotalInym, 10) + parseFloat(importeRetener, 10);
                            
                            baseCalculo = baseCalculoImp;
                        }

                        if (!utilidades.isEmpty(idTipoRetencion) && !utilidades.isEmpty(idRetencion) && !utilidades.isEmpty(idPagoProveedor)) {
                            var resultRecMach = arrayRetenciones.filter(function (obj) {
                                return (obj.idInternoRet == idInternoRet);
                            });

                            if (!utilidades.isEmpty(resultRecMach) && resultRecMach.length > 0) {
                                var idRetencion = resultRecMach[0].idInternoRet;
                                log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT EDIT - resultRecMach: " + JSON.stringify(resultRecMach) + " - ID RETENCION A ACTUALIZAR: " + idRetencion);
                                var recordRetencion = record.load({
                                    type: "customrecord_l54_retencion",
                                    id: idRetencion,
                                    isDynamic: true
                                });

                                if (!utilidades.isEmpty(recordRetencion)) {
                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_importe", value: importeRetener });
                                    recordRetencion.setValue({ fieldId: "custrecord_54_ret_base_calculo", value: baseCalculo });
                                    recordRetencion.setValue({ fieldId: "custrecord_54_ret_base_calculo_imp", value: baseCalculoImp });
                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_neto_bill_aplicado", value: netoBillAplicados });
                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_jurisdiccion", value: jurisdiccion });

                                    //NUEVO - SI EL TIPO DE CONTRIBUYENTE ES IIBB, GRABO EL TIPO DE CONTRIBUYENTE
                                    if ((idTipoRetencion == 3 || idTipoRetencion == 5 || idTipoRetencion == 6) && !utilidades.isEmpty(idTipoContribuyente)) {
                                        recordRetencion.setValue({ fieldId: "custrecord_l54_ret_tipo_contrib_iibb", value: idTipoContribuyente });
                                    }

                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_alicuota", value: alicuota });
                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_tipo_exencion", value: idTipoExencion });
                                    recordRetencion.setValue({ fieldId: "custrecord_l54_ret_cert_exencion", value: certificadoExencion });

                                    if (!utilidades.isEmpty(fechaExencion)) {
                                        var fechaExencionString = parseDate(fechaExencion);
                                        //log.error('L54 - Calcular Retenciones (SS)', 'BEFORESUBMIT EDIT - fechaExencion: '+ fechaExencion + ' - fechaExencionString: ' + fechaExencionString);
                                        recordRetencion.setValue({ fieldId: "custrecord_l54_ret_fecha_exencion", value: fechaExencionString });
                                    }

                                    if (!utilidades.isEmpty(tarifa) && idTipoRetencion == 6) recordRetencion.setValue({ fieldId: "custrecord_l54_ret_tarifa", value: tarifa });

                                    if (!utilidades.isEmpty(unidad) && idTipoRetencion == 6) recordRetencion.setValue({ fieldId: "custrecord_l54_ret_unidad", value: unidad });

                                    try {
                                        var idRR = recordRetencion.save();
                                        log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT EDIT - RETENCION ACTUALIZADA - ID INTERNO: " + idRetencion);
                                    }
                                    catch (e) {
                                        log.error("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT EDIT - ERROR ACTUALIZANDO RETENCION - ID RETENCION: " + idRetencion + ". EXCEPCION DETALLES: " + e.message);
                                    }
                                }
                            }
                        }
                    }
                    objRecord.setValue({
                        fieldId: "custbody_l54_gan_imp_a_retener",
                        value: importeTotalGanancias,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_iva_imp_a_retener",
                        value: importeTotalIVA,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_iibb_imp_a_retener",
                        value: importeTotalIIBB,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_municipal_imp_a_retener",
                        value: importeTotalMuni,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_inym_imp_a_retener",
                        value: importeTotalInym,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_suss_imp_a_retener",
                        value: importeTotalSUSS,
                        ignoreFieldChange: false
                    });

                    var importeTotalRetencion = parseFloat(importeTotalGanancias, 10) + parseFloat(importeTotalIVA, 10) + parseFloat(importeTotalIIBB, 10) + parseFloat(importeTotalMuni, 10) + parseFloat(importeTotalInym, 10) + parseFloat(importeTotalSUSS, 10);
                    var total = objRecord.getValue({ fieldId: "total" });
                    var importeNetoAbonar = parseFloat(total, 10) - parseFloat(importeTotalRetencion, 10);

                    if (importeTotalRetencion > 0)
                        log.debug("L54 - Calcular Retenciones (SS)", "BEFORESUBMIT " + scriptContext.type + " - CALCULO AUTOMATICO DE RETENCIONES - EXISTE INFORMACION DE RETENCIONES - IMPORTE TOTAL: " + importeTotalRetencion);

                    objRecord.setValue({
                        fieldId: "custbody_l54_importe_neto_a_abonar",
                        value: importeNetoAbonar,
                        ignoreFieldChange: false
                    });

                    objRecord.setValue({
                        fieldId: "custbody_l54_importe_total_retencion",
                        value: importeTotalRetencion,
                        ignoreFieldChange: false
                    });

                    log.audit("L54 - Calcular Retenciones (SS)", "FIN - BEFORESUBMIT " + scriptContext.type);
                }
            } catch (e) {
                log.error("L54 - Calcular Retenciones (SS)", "ERROR EN EL EVENTO BEFORESUBMIT - CONTEXTO: " + scriptContext.type + " - EXCEPCIÓN DETALLES: " + e.message);
                log.error("L54 - Calcular Retenciones (SS)", "ERROR EN EL EVENTO BEFORESUBMIT - CONTEXTO: " + scriptContext.type + " - EXCEPCIÓN DETALLES COMPLETO: " + JSON.stringify(e));

                if (!utilidades.isEmpty(arrayRetencionesCSV) && arrayRetencionesCSV.length > 0) {
                    eliminarRetencionesCSV(arrayRetencionesCSV);
                }

                arrayRetencionesCSV = null;

                if (!utilidades.isEmpty(mensajeErrorRetencionAutomatica)) {
                    throw mensajeErrorRetencionAutomatica;
                } else {
                    if (!utilidades.isEmpty(erroresCalculoRetencionesFacturaM)) {
                        throw erroresCalculoRetencionesFacturaM;
                    }
                }
            }
            //IVA TOTAL
            let amountNeto = objRecord.getValue({
                fieldId: "custbody_l54_importe_neto_a_abonar"
            });

            log.debug("amountNeto", amountNeto)
            if(amountNeto < 0){
                let messageAmount = "El monto de las retenciones es mayor al total a pagar."
                throw messageAmount;
            }
        }

        /**
          * Function definition to be triggered before record is loaded.
          *
          * @param {Object} scriptContext
          * @param {Record} scriptContext.newRecord - New record
          * @param {Record} scriptContext.oldRecord - Old record
          * @param {string} scriptContext.type - Trigger type
          * @Since 2015.2
          */
        function afterSubmit(scriptContext) {

            try {
                log.audit("L54 - Calcular Retenciones (SS)", "INICIO - AFTERSUBMIT " + scriptContext.type);
                var script = runtime.getCurrentScript();

                log.debug("Governance Monitoring", "Memoria = " + script.getRemainingUsage());

                var objRta = new Object();
                objRta.error = false;
                objRta.warning = false;
                objRta.mensajeError = new Array();
                objRta.mensajeWarning = new Array();
                objRta.mensajeOk = "";

                //INVOCO A LA FUNCION
                var recId = scriptContext.newRecord.id;
                var recType = scriptContext.newRecord.type;
                var type = scriptContext.type;

                log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - ANTES DE LLAMAR PROCESAVENDORPAYMENT - PARAMETROS - RECID: " + recId + " - RECTYPE: " + recType + " - TYPE: " + type);

                if (!utilidades.isEmpty(recId) && !utilidades.isEmpty(recType) && recId > 0) {
                    // Se actualizan las retenciones creadas desde importacion CSV para que se relacionen con el pago actual
                    if (runtime.executionContext == "CSVIMPORT" || runtime.executionContext == "WEBSERVICES") {
                        var recordT = scriptContext.newRecord;
                        var arrayRetencionesCSV = !utilidades.isEmpty(recordT.getValue({ fieldId: "custbody_l54_id_retenciones_csv" })) ? JSON.parse(recordT.getValue({ fieldId: "custbody_l54_id_retenciones_csv" })) : [];
                        // var arrayRetencionesCSV = JSON.parse(recordT.getValue({ fieldId: 'custbody_l54_id_retenciones_csv' }));
                        // var arrayAcumuladosCSV = JSON.parse(recordT.getValue({ fieldId: 'custbody_l54_id_acumulados_csv' }));

                        log.audit("L54 - Calcular Retenciones (SS)", "LINE 1746 - Antes de actualizar registros de retenciones: " + JSON.stringify(arrayRetencionesCSV) + " - Unidades de ejecuion restantes: " + script.getRemainingUsage());
                        if (!utilidades.isEmpty(arrayRetencionesCSV) && arrayRetencionesCSV.length > 0) {
                            for (var m = 0; m < arrayRetencionesCSV.length; m++) {
                                record.submitFields({
                                    type: "customrecord_l54_retencion",
                                    id: arrayRetencionesCSV[m],
                                    values: {
                                        isinactive: false,
                                        custrecord_l54_ret_ref_pago_prov: recId,
                                    },
                                    options: {
                                        enableSourcing: true,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                        }
                        log.audit("L54 - Calcular Retenciones (SS)", "LINE 1762 - Despues de actualizar registros de retenciones - Unidades de ejecuion restantes: " + script.getRemainingUsage());
                    }

                    procesaVendorPayment(type, recType, recId, objRta, null, script);
                }
                log.audit("L54 - Calcular Retenciones (SS)", "FIN - AFTERSUBMIT " + scriptContext.type);
            } catch (e) {
                log.error("L54 - Calcular Retenciones (SS)", "ERROR EN EL EVENTO AFTERSUBMIT - CONTEXTO: " + scriptContext.type + " - recType: " + recType + " - recId: " + recId + " - EXCEPCIÓN DETALLES: " + e.message);
            }
        }

        function procesaVendorPayment(type, recType, recId, objRta, infoRetIIBB, script) {

            try {
                log.audit("L54 - Calcular Retenciones (SS)", "INICIO - AFTERSUBMIT - PROCESAVENDORPAYMENT - PARAMETROS: TYPE: " + type + " - RECTYPE: " + recType + " - RECID:  " + recId + " - OBJRTA: " + JSON.stringify(objRta) + ",infoRetIIBB:" + JSON.stringify(infoRetIIBB));
                log.audit("L54 - Calcular Retenciones (SS)", "LINE 1687 - Unidades de ejecuion restantes: " + script.getRemainingUsage());
                var registroCargado = false;
                var idFolderRetencion = null;
                var cal_ret_auto = false;
                var subsidiary = null;
                var esOneWorld = false;
                var numerador_manual = false;

                if (type == "create" || type == "edit" || type == "paybills") {
                    if (!utilidades.isEmpty(recId)) {
                        try {
                            var recordT = record.load({
                                type: recType,
                                id: recId,
                                isDynamic: true,
                            });

                            var recVoided = recordT.getValue({ fieldId: "voided" });
                            var recStatus = recordT.getValue({ fieldId: "status" });
                            var codigo_op = recordT.getValue({ fieldId: "custbody_l54_numero_localizado" });
                            var entity = recordT.getValue({ fieldId: "entity" });
                            var trandate = recordT.getValue({ fieldId: "trandate" });
                            var esND = recordT.getValue({ fieldId: "custbody_l54_nd" });
                            var tasa_pago = recordT.getValue({ fieldId: "exchangerate" });
                            numerador_manual = recordT.getValue({ fieldId: "custbody_l54_numerador_manual" });
                            var bocaId = recordT.getValue({ fieldId: "custbody_l54_boca" });
                            var letraId = recordT.getValue({ fieldId: "custbody_l54_letra" });
                            var tipoTransStr = "vendorpayment";
                            var esPagoMasivo = recordT.getValue({ fieldId: "custbody_l54_es_pago_masivo" });
                            var subsidiaria = null;
                            esOneWorld = utilidades.l54esOneworld();
                            if (esOneWorld) {
                                subsidiary = recordT.getValue({ fieldId: "subsidiary" });
                                subsidiaria = subsidiary;
                            }

                            //DEFINO IDENTIFICADORES PARA LAS CUENTAS CONTABLES
                            var id_account = recordT.getValue({ fieldId: "account" }); // cuenta contable original del pago
                            var objDatosImpositivos = consultaDatosImpositivos(subsidiaria);
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - DATOS IMPOSITIVOS INFO: " + JSON.stringify(objDatosImpositivos) + " - ES PAGOMASIVO?: " + esPagoMasivo + " - CODIGO_OP (NUM LOCALIZADO): " + codigo_op);
                            var id_ret_ganancias = objDatosImpositivos[0].idCCRetGAN; // cuenta contable ganancias
                            var id_ret_suss = objDatosImpositivos[0].idCCRetSUSS; // cuenta contable SUSS
                            var id_ret_iva = objDatosImpositivos[0].idCCRetIVA; // cuenta contable IVA
                            var idsRetGanancia = recordT.getValue({ fieldId: "custbody_l54_id_ret_ganancias" });
                            var idsRetIVA = recordT.getValue({ fieldId: "custbody_l54_id_ret_iva" });
                            var idsRetIIBB = recordT.getValue({ fieldId: "custbody_l54_id_ret_iibb" });
                            var idsRetSUSS = recordT.getValue({ fieldId: "custbody_l54_id_ret_suss" });
                            cal_ret_auto = objDatosImpositivos[0].calRetAutomaticamente;
                            idFolderRetencion = objDatosImpositivos[0].folderIdRetenciones;
                            registroCargado = true;
                            var formJournalEntryRetencion = objDatosImpositivos[0].formJurnalEntryRet;

                            /** Modificación 16-01 Clearing Account */
                            var ctaBancoAuxiliar = recordT.getValue('custbody_l54_cuenta_banco');
                            var currency = recordT.getValue({ fieldId: "currency" });
                            var paramFormaPago = runtime.getCurrentScript().getParameter({ name: "custscript_l54_calcular_ret_ss_form" });
                            var formaPago= recordT.getValue({ fieldId: "custbody_3k_forma_pago_local" });
                            var cantLinRet = recordT.getLineCount({ sublistId: 'recmachcustrecord_l54_ret_ref_pago_prov' });
                            var montoTotal = parseFloat(recordT.getValue('total'), 10).toFixedOK(2);
                            var cuentaClearing = '';
                            var flagClearing = false;
                            if (objDatosImpositivos[0].applyAccountClearing && paramFormaPago != formaPago && cantLinRet > 0) { // si se aplica clearing
                                cuentaClearing = recordT.getValue('account');
                                //recordT.setValue('account', cuentaClearing);
                                idCuentaCont = cuentaClearing;
                                flagClearing = true;
                                
                                log.debug("Governance Monitoring", "Memoria = " + script.getRemainingUsage());
                            }else{
                                idCuentaCont = id_account;
                            }

                        }
                        catch (e) {
                            log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR MIENTRAS SE CARGABA TRANSACCION: " + recType + " - ID INTERNO: " + recId + " - CONTEXTO: " + type + ". EXCEPCION DETALLES:: " + e.message);
                            registroCargado = false;
                            objRta.error = true;
                            objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR MIENTRAS SE CARGABA TRANSACCION: " + recType + " - ID INTERNO: " + recId + " - CONTEXTO: " + type + ". EXCEPCION DETALLES:: " + e.message;
                        }
                    }
                }
                log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - REGISTRO CARGADO?: " + registroCargado + " - NUMERADOR MANUAL: " + numerador_manual + " - CONTEXTO: " + type);
                log.audit("L54 - Calcular Retenciones (SS)", "LINE 1775 - Unidades de ejecuion restantes: " + script.getRemainingUsage());
                if (registroCargado == true) {
                    
                    if (type == "create" || type == "paybills") { // Alex Crear
                        // si se utiliza numerador automatico
                        if (numerador_manual == false && utilidades.isEmpty(codigo_op)) {
                            var tipoTransId = numeradorAUtilizar(getTipoTransId(tipoTransStr), esND, subsidiaria);
                            var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria);
                            recordT.setValue({ fieldId: "custbody_l54_numero", value: numeradorArray["numerador"] });
                            recordT.setValue({ fieldId: "custbody_l54_numero_localizado", value: numeradorArray["numeradorPrefijo"] });
                            var numeradorClearig = numeradorArray["numerador"];
                            var numLocalizadoClearing = numeradorArray["numeradorPrefijo"];
                            codigo_op = numeradorArray["numeradorPrefijo"];
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - TIPOTRANSID: " + tipoTransId + " - PUNTO VENTA: " + bocaId + " LETRA: " + letraId + " SUBSIDIARIA: " + subsidiaria + " - NUMERADOR: " + JSON.stringify(numeradorArray) + " - CODIGO OP: " + codigo_op);
                            
                            log.debug("Governance Monitoring", "Memoria = " + script.getRemainingUsage());
                        }

                        var moneda = recordT.getValue({ fieldId: "currency" });
                        var department = recordT.getValue({ fieldId: "department" });
                        var location = recordT.getValue({ fieldId: "location" });
                        var clase = recordT.getValue({ fieldId: "class" });
                        var monto_ret_ganancias = recordT.getValue({ fieldId: "custbody_l54_gan_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
                            monto_ret_ganancias = "0.00";

                        var monto_ret_suss = recordT.getValue({ fieldId: "custbody_l54_suss_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
                            monto_ret_suss = "0.00";

                        var monto_ret_iva = recordT.getValue({ fieldId: "custbody_l54_iva_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
                            monto_ret_iva = "0.00";

                        var monto_ret_iibb = recordT.getValue({ fieldId: "custbody_l54_iibb_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
                            monto_ret_iibb = "0.00";

                        var monto_ret_muni = recordT.getValue({ fieldId: "custbody_l54_municipal_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_muni) || isNaN(monto_ret_muni))
                            monto_ret_muni = "0.00";

                        var monto_ret_inym = recordT.getValue({ fieldId: "custbody_l54_inym_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_inym) || isNaN(monto_ret_inym))
                            monto_ret_inym = "0.00";

                        monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
                        monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
                        monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
                        monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
                        monto_ret_muni = parseFloat(monto_ret_muni, 10).toFixed(2);
                        monto_ret_inym = parseFloat(monto_ret_inym, 10).toFixed(2);
                        var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10) + parseFloat(monto_ret_muni, 10)  + parseFloat(monto_ret_inym, 10));
                        monto_ret_total = monto_ret_total.toFixed(2);
                        var importeNetoAbonar = parseFloat(parseFloat(montoTotal, 10) - parseFloat(monto_ret_total, 10), 10).toFixedOK(2);

                        log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - MONTOS USADOS EN LAS RETENCIONES GENERADAS - RETENCION TOTAL: " + monto_ret_total + " - RETENCION GANANCIAS: " + monto_ret_ganancias + " - RETENCION SUSS: " + monto_ret_suss + " - RETENCION IVA: " + monto_ret_iva + " - RETENCION IIBB: " + monto_ret_iibb);

                        //SI EL PAGO SUFRE ALGUN TIPO DE RETENCION
                        if (parseFloat(monto_ret_ganancias, 10) != 0 || parseFloat(monto_ret_suss, 10) != 0 || parseFloat(monto_ret_iva, 10) != 0 || parseFloat(monto_ret_iibb, 10) != 0 || parseFloat(monto_ret_muni, 10) != 0 || parseFloat(monto_ret_inym, 10) != 0) {
                            
                            //SE CREA JOURNAL ENTRY
                            var record_journalentry = record.create({
                                type: record.Type.JOURNAL_ENTRY,
                                isDynamic: true
                            });
                            configurarEstadoAprobacionJournalEntry(record_journalentry);

                            log.debug("Governance Monitoring", "Memoria = " + script.getRemainingUsage());
                            record_journalentry.setValue({ fieldId: "customform", value: formJournalEntryRetencion });
                            record_journalentry.setValue({ fieldId: "memo", value: codigo_op });
                            record_journalentry.setValue({ fieldId: "custbody_l54_op_asociado", value: codigo_op });
                            if (!utilidades.isEmpty(subsidiary)) {
                                record_journalentry.setValue("subsidiary", subsidiary);
                            }
                            record_journalentry.setValue({ fieldId: "trandate", value: trandate });
                            record_journalentry.setValue({ fieldId: "currency", value: moneda });
                            record_journalentry.setValue({ fieldId: "exchangerate", value: parseFloat(tasa_pago, 10) });

                            //INICIO - SE AGREGA LINEA DE MONTO TOTAL (DEBITO)
                            record_journalentry.selectNewLine("line");
                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });

                            if (!utilidades.isEmpty(department))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                            if (!utilidades.isEmpty(location))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                            if (!utilidades.isEmpty(clase))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });

                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: idCuentaCont });
                            if(flagClearing){
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(montoTotal, 10) });
                            }else{
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(monto_ret_total, 10) });
                            }
                            record_journalentry.commitLine("line");
                            //FIN - SE AGREGA LINEA DE MONTO TOTAL (DEBITO)

                            if(flagClearing){
                                record_journalentry.selectNewLine("line");
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });

                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: ctaBancoAuxiliar });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(importeNetoAbonar, 10) });
                                
                                record_journalentry.commitLine("line");
                                
                                log.debug("Governance Monitoring flagClearing", "Memoria = " + script.getRemainingUsage());
                            }

                            //SI TIENE RETENCIONES DE GANANCIAS
                            if (parseFloat(monto_ret_ganancias, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_ganancias, 10))) {

                                //INICIO - SE AGREGA LINEA DE RET GANANCIAS (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_ganancias });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_ganancias, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET GANANCIAS (CREDIT)
                                
                                log.debug("Governance Monitoring monto_ret_ganancias", "Memoria = " + script.getRemainingUsage());
                            }

                            //SI TIENE RETENCIONES DE SUSS
                            if (parseFloat(monto_ret_suss, 10) != 0 && parseFloat(monto_ret_suss, 10) != "") {

                                //INICIO - SE AGREGA LINEA DE RET SUSS (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_suss });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_suss, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET SUSS (CREDIT)
                                
                log.debug("Governance Monitoring monto_ret_suss", "Memoria = " + script.getRemainingUsage());
                            }

                            //SI TIENE RETENCIONES DE IVA
                            if (parseFloat(monto_ret_iva, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_iva, 10))) {
                                //INICIO - SE AGREGA LINEA DE RET IVA (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_iva });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_iva, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET IVA (CREDIT)
                                
                                log.debug("Governance Monitoring monto_ret_iva", "Memoria = " + script.getRemainingUsage());
                            }

                            //SI TIENE RETENCIONES DE IIBB
                            if ((parseFloat(monto_ret_iibb, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_iibb, 10))) || (parseFloat(monto_ret_muni, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_muni, 10))) || (parseFloat(monto_ret_inym, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_inym, 10)))) {
                                var importeIIBB;
                                var jurisdiccionIIBB;
                                var numLinesRetenciones = recordT.getLineCount({
                                    sublistId: "recmachcustrecord_l54_ret_ref_pago_prov"
                                });

                                log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - NUMLINESRETENCIONES: " + numLinesRetenciones);
                                /** Optimizando Codigo */

                                var arrayCuenta = obtenerArraysCuentas(subsidiaria);
                                for (var j = 0; !utilidades.isEmpty(numLinesRetenciones) && j < numLinesRetenciones; j++) {
                                    var tipoRetencion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: j });
                                    if (tipoRetencion == 3 || tipoRetencion == 5 || tipoRetencion == 6)//IIBB
                                    {
                                        jurisdiccionIIBB = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: j });
                                        importeIIBB = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: j });
                                       
                                        /** Optimizando Codigo */
                                        var result = arrayCuenta.filter(function (obj) {
                                            return (obj.jurisdiccion == jurisdiccionIIBB)
                                        });
                                       
                                        var flag = (!isEmpty(result) && result.length > 0) ? true : false;

                                        if(flag){
                                            log.debug('entro', arrayCuenta)
                                            var cuentaIIBB = result[0].idCuenta;
                                        }else{
                                            var cuentaIIBB = obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB);
                                        }

                                        record_journalentry.selectNewLine("line");
                                        if (!utilidades.isEmpty(department))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                        if (!utilidades.isEmpty(location))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                        if (!utilidades.isEmpty(clase))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                        //RETENCIONES IIBB
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: cuentaIIBB });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(importeIIBB, 10) });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                        record_journalentry.commitLine("line");
                                    }
                                }
                                
                            log.debug("Governance Monitoring numLinesRetenciones", "Memoria = " + script.getRemainingUsage());
                            }
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ACTUALIZANDO REGISTROS DE RETENCIONES - INDICE: " + j + " - TIPO RETENCION: " + tipoRetencion + " - CODIGO PAGO PROVEEDOR: " + codigo_op + " - NUMERO RETENCION: " + numeradorArray["numeradorPrefijo"]);
                            //SOLO GENERA NUMERADOR SI NO VINO POR PAGO MASIVO. SI ES PAGO MASIVO SE GENERA PREVIAMENTE
                            if (esPagoMasivo == false) {
                                var numLinesRetenciones = recordT.getLineCount({
                                    sublistId: "recmachcustrecord_l54_ret_ref_pago_prov"
                                });
                                log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - NUMLINESRETENCIONES: " + numLinesRetenciones);
                                /** Optimizando codigo */
                                var objTipoTransID = {
                                    "tipoTransIdGan": null,
                                    "tipoTransIdIVA": null,
                                    "tipoTransIdIIBB": null,
                                    "tipoTransIdSUSS": null,
                                    "tipoTransIdMuni": null,
                                    "tipoTransIdYnym": null,
                                }
                                for (var j = 0; !utilidades.isEmpty(numLinesRetenciones) && j < numLinesRetenciones; j++) {

                                    var tipoRetencion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: j });
                                    var jurisdiccion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: j });

                                    try {
                                        var numeradorArray = null;
                                        if (tipoRetencion == 1)//GANANCIAS
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdGan)){
                                                var tipoTransIdGan = objTipoTransID.tipoTransIdGan;
                                            }else{
                                                var tipoTransIdGan = getTipoTransId("num_ret_ganancias");
                                                objTipoTransID.tipoTransIdGan = tipoTransIdGan;
                                            }
                                            numeradorArray = devolverNuevoNumero(tipoTransIdGan, bocaId, letraId, subsidiaria, null);
                                        
                                        }
                                        if (tipoRetencion == 2)//IVA
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdIVA)){
                                                var tipoTransIdIVA = objTipoTransID.tipoTransIdIVA;
                                            }else{
                                                var tipoTransIdIVA = getTipoTransId("num_ret_iva");
                                                objTipoTransID.tipoTransIdIVA = tipoTransIdIVA;
                                            }
                                            
                                            numeradorArray = devolverNuevoNumero(tipoTransIdIVA, bocaId, letraId, subsidiaria, null);
                                        }
                                        if (tipoRetencion == 3)//INGRESOS BRUTOS
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdIIBB)){
                                                var tipoTransIdIIBB = objTipoTransID.tipoTransIdIIBB;
                                            }else{
                                                var tipoTransIdIIBB = getTipoTransId("num_ret_iibb");
                                                objTipoTransID.tipoTransIdIIBB = tipoTransIdIIBB;
                                            }

                                            numeradorArray = devolverNuevoNumero(tipoTransIdIIBB, bocaId, letraId, subsidiaria, jurisdiccion);
                                        }
                                        if (tipoRetencion == 4)//SUSS
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdSUSS)){
                                                var tipoTransIdSUSS = objTipoTransID.tipoTransIdSUSS;
                                            }else{
                                                var tipoTransIdSUSS = getTipoTransId("num_ret_suss");
                                                objTipoTransID.tipoTransIdSUSS = tipoTransIdSUSS;
                                            }
                                            
                                            numeradorArray = devolverNuevoNumero(tipoTransIdSUSS, bocaId, letraId, subsidiaria, null);
                                        }
                                        if (tipoRetencion == 5)//Municipal
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdMuni)){
                                                var tipoTransIdMuni = objTipoTransID.tipoTransIdMuni;
                                            }else{
                                                var tipoTransIdMuni = getTipoTransId("num_ret_municipal");
                                                objTipoTransID.tipoTransIdMuni = tipoTransIdMuni;
                                            }
                                            
                                            numeradorArray = devolverNuevoNumero(tipoTransIdMuni, bocaId, letraId, subsidiaria, jurisdiccion);
                                        }
                                        if (tipoRetencion == 6)//YNYM
                                        {
                                            if(!utilidades.isEmpty(objTipoTransID.tipoTransIdYnym)){
                                                var tipoTransIdYnym = objTipoTransID.tipoTransIdYnym;
                                            }else{
                                                var tipoTransIdYnym = getTipoTransId("num_ret_inym");
                                                objTipoTransID.tipoTransIdYnym = tipoTransIdYnym;
                                            }
                                            
                                            numeradorArray = devolverNuevoNumero(tipoTransIdYnym, bocaId, letraId, subsidiaria, jurisdiccion);
                                        }
                                        var numeradoPrefijo = numeradorArray["numeradorPrefijo"] ? numeradorArray["numeradorPrefijo"] : '';
                                       
                                        recordT.selectLine({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", line: j });
                                        recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_cod_pago_prov", value: codigo_op, ignoreFieldChange: false });
                                        recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_numerador", value: numeradoPrefijo, ignoreFieldChange: false });
                                        recordT.commitLine({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });
                                        log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ACTUALIZANDO REGISTROS DE RETENCIONES - INDICE: " + j + " - TIPO RETENCION: " + tipoRetencion + " - CODIGO PAGO PROVEEDOR: " + codigo_op + " - NUMERO RETENCION: " + numeradorArray["numeradorPrefijo"]);
                                    }
                                    catch (e) {
                                        log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO LINEAS DE RETENCIONES POR RECMACH GAN, SUSS, IVA E IIBB - EXCEPCION DETALLES: " + e.message);
                                        objRta.error = true;
                                        objRta.mensajeError = "L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO LINEAS DE RETENCIONES POR RECMACH GAN, SUSS, IVA E IIBB - EXCEPCION DETALLES: " + e.message;
                                    }
                                }
                            }


                            var id_journalentry = null;
                            try {
                                
                                id_journalentry = record_journalentry.save();
                                //recordT = aplicarJournalEntry(recordT, id_journalentry);
                                /*if (flagClearing) { // si se aplica clearing
                                    recordT.setValue('account', cuentaClearing);
                                    recordT.setValue({ fieldId: "custbody_l54_numero", value: numeradorClearig });
                                    recordT.setValue({ fieldId: "custbody_l54_numero_localizado", value: numLocalizadoClearing });
                                
                                    log.error("Governance Monitoring guarda journlas", "Memoria = " + script.getRemainingUsage());
                                }*/
                                
                                log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - SE GENERO EL JOURNALENTRY EXITOSAMENTE - ID: " + id_journalentry);
                            }
                            catch (e) {
                                log.error("L54 - Calcular Retenciones (SS)", "ERROR GENERANDO JOURNALENTRY - EXCEPTION DETALLES: " + e.message);
                                objRta.error = true;
                                objRta.mensajeError = "ERROR GENERANDO JOURNALENTRY - EXCEPTION DETALLES: " + e.message;
                            }

                            try {
                                var pdfFile = file.create({
                                    name: "RET PAGO " + recordT.getValue({ fieldId: "custbody_l54_numero_localizado" }) + ".pdf",
                                    fileType: file.Type.PLAINTEXT,
                                    contents: "dummy",
                                    folder: idFolderRetencion
                                });

                                var idFile = pdfFile.save();

                                //SI SE CREO PDF SE ASOCIA A LA TRANSACCION
                                if (!utilidades.isEmpty(idFile))
                                    recordT.setValue({ fieldId: "custbody_l54_pdf_retenciones", value: idFile });
                            }
                            catch (e) {
                                log.error("L54 - CALCULAR RETENCIONES (SS)", "ERROR GENERANDO PDF EN BLANCO - EXCEPCION DETALLES: " + e.message);
                                objRta.error = true;
                                objRta.mensajeError = "L54 - CALCULAR RETENCIONES (SS)", "ERROR GENERANDO PDF EN BLANCO - EXCEPCION DETALLES: " + e.message;
                            }

                            //ACTUALIZO EL JOURNAL ENTRY ASOCIADO AL PAGO, EN CASO DE CORRESPONDER
                            recordT.setValue({ fieldId: "custbody_l54_id_je_vendorpayment", value: id_journalentry });
                            recordT.setValue({ fieldId: "custbody_l54_ret_calculadas", value: true });
                            objRta.nro_asiento = id_journalentry;
                        }

                        var importe_neto_a_abonar_tmp = 0.00;
                        importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(recordT.getValue({ fieldId: "total" }), 10) - (parseFloat(recordT.getValue({ fieldId: "custbody_l54_importe_total_retencion" }), 10)));

                        recordT.setValue({ fieldId: "custbody_l54_importe_neto_a_abonar", value: importe_neto_a_abonar_tmp });
                        recordT.setValue({ fieldId: "custbody_3k_neto_abonar_local_curr", value: format.format({ value: parseFloat(parseFloat(importe_neto_a_abonar_tmp, 10) * parseFloat(tasa_pago, 10), 10).toFixed(2), type: format.Type.CURRENCY }) });

                        //RUTINA DE MONTO ESCRITO  
                        var numeroEnLetras = getNumeroEnLetras(importe_neto_a_abonar_tmp, subsidiaria);
                        log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - NUMEROENLETRAS: " + numeroEnLetras);

                        if (!utilidades.isEmpty(numeroEnLetras))
                            recordT.setValue({ fieldId: "custbody_l54_monto_escrito", value: normalize(numeroEnLetras) });

                        var infoVendorPayment = new Object();
                        infoVendorPayment.ret_gan_numerador = recordT.getValue({ fieldId: "custbody_l54_ret_gan_numerador" });
                        infoVendorPayment.ret_suss_numerador = recordT.getValue({ fieldId: "custbody_l54_ret_suss_numerador" });
                        infoVendorPayment.ret_iva_numerador = recordT.getValue({ fieldId: "custbody_l54_ret_iva_numerador" });
                        infoVendorPayment.ret_iibb_numerador = recordT.getValue({ fieldId: "custbody_l54_ret_iibb_numerador" });
                        infoVendorPayment.ret_calculadas = recordT.getValue({ fieldId: "custbody_l54_ret_calculadas" });
                        infoVendorPayment.iva_imp_a_retener = recordT.getValue({ fieldId: "custbody_l54_iva_imp_a_retener" });
                        infoVendorPayment.suss_imp_a_retener = recordT.getValue({ fieldId: "custbody_l54_suss_imp_a_retener" });
                        infoVendorPayment.gan_imp_a_retener = recordT.getValue({ fieldId: "custbody_l54_gan_imp_a_retener" });
                        infoVendorPayment.gan_imp_a_retener = recordT.getValue({ fieldId: "custbody_l54_gan_imp_a_retener" });
                        infoVendorPayment.iibb_imp_a_retener = recordT.getValue({ fieldId: "custbody_l54_iibb_imp_a_retener" });
                        infoVendorPayment.subsidiaria = subsidiary;
                        infoVendorPayment.version_calc_ret = recordT.getValue({ fieldId: "custbody_l54_version_calc_ret" });
                        infoVendorPayment.idVendorPayment = recId;

                        //ARREGLOS QUE GUARDARAN LOS ID DE RETENCION POR CADA TIPO
                        var arrayIdGAN = new Array();
                        var arrayIdSUSS = new Array();
                        var arrayIdIIBB = new Array();
                        var arrayIdMuni = new Array();
                        var arrayIdYnym = new Array();
                        var arrayIdIVA = new Array();

                        //INICIO - SE ACTUALIZAN LOS CAMPOS SUBSIDIARIA, PUNTO DE VENTA, LETRA, IMPORTE NETO A ABONAR YA QUE NO SALTA LA FUNCIONALIDAD DE ORIGEN Y FILTRACION
                        var numLinesRetenciones = recordT.getLineCount({
                            sublistId: "recmachcustrecord_l54_ret_ref_pago_prov"
                        });

                        var tipoRetencion = null;
                        var idRetencion = null;
                        var bocaAUX = recordT.getText({ fieldId: "custbody_l54_boca" });
                        var letraAUX = recordT.getText({ fieldId: "custbody_l54_letra" });

                        for (var j = 0; !utilidades.isEmpty(numLinesRetenciones) && j < numLinesRetenciones; j++) {
                            tipoRetencion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: j });
                            idRetencion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "id", line: j });
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ACTUALIZANCION DE SUBSIDIARIA, PUNTO DE VENTA, LETRA, IMPORTE NETO A ABONAR EN LAS RETENCIONES VINCULADAS - INDICE: " + j + " - TIPORETENCION: " + tipoRetencion + " - IDRETENCION: " + idRetencion + " - SUBSIDIARIA: " + subsidiary + " - PUNTO DE VENTA: " + bocaAUX + " - LETRA: " + letraAUX + " - IMPORTE NETO ABONAR: " + importe_neto_a_abonar_tmp);
                            try {
                                recordT.selectLine({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", line: j });
                                recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_subsidiaria", value: subsidiary, ignoreFieldChange: false });
                                recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_pv_pago_prov", value: bocaAUX, ignoreFieldChange: false });
                                recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_let_pago_prov", value: letraAUX, ignoreFieldChange: false });
                                recordT.setCurrentSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_imp_neto_pago", value: importe_neto_a_abonar_tmp, ignoreFieldChange: false });
                                recordT.commitLine({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov" });

                            }
                            catch (e) {
                                log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO SUBSIDIARIA, PUNTO DE VENTA, LETRA, IMPORTE NETO A ABONAR EN LINEAS DE RETENCIONES POR RECMACH GAN, SUSS, IVA E IIBB - EXCEPTION DETALLES: " + e.message);
                                objRta.error = true;
                                objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO SUBSIDIARIA, PUNTO DE VENTA, LETRA, IMPORTE NETO A ABONAR EN LINEAS DE RETENCIONES POR RECMACH GAN, SUSS, IVA E IIBB - EXCEPTION DETALLES: " + e.message;
                            }

                            if (tipoRetencion == 1)//GANANCIAS
                            {
                                arrayIdGAN.push(idRetencion);
                            }
                            else {
                                if (tipoRetencion == 2)//IVA
                                {
                                    arrayIdIVA.push(idRetencion);
                                }
                                else {
                                    if (tipoRetencion == 3)//INGRESOS BRUTOS
                                    {
                                        arrayIdIIBB.push(idRetencion);
                                    }
                                    else {
                                        if (tipoRetencion == 5)//Municipal
                                        {
                                            arrayIdMuni.push(idRetencion);
                                        }
                                        else {
                                            if (tipoRetencion == 6)//YNYM
                                            {
                                                arrayIdYnym.push(idRetencion);
                                            }
                                            else{
                                            //SUSS
                                            arrayIdSUSS.push(idRetencion);
                                            }
                                        }
                                    }
                                }
                            }
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ARRAYIDGAN: " + JSON.stringify(arrayIdGAN) + " - ARRAYIDIVA: " + JSON.stringify(arrayIdIVA) + " - ARRAYIDIIBB: " + JSON.stringify(arrayIdIIBB) + " - ARRAYIDMUNI: " + JSON.stringify(arrayIdMuni)+ " - ARRAYIDSUSS: " + JSON.stringify(arrayIdSUSS));

                            if (arrayIdGAN.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_ganancias", value: arrayIdGAN.toString() });

                            if (arrayIdIVA.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_iva", value: arrayIdIVA.toString() });

                            if (arrayIdIIBB.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_iibb", value: arrayIdIIBB.toString() });

                            if (arrayIdSUSS.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_suss", value: arrayIdSUSS.toString() });

                            if (arrayIdMuni.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_muni", value: arrayIdMuni.toString() });
                            
                            if (arrayIdYnym.length > 0)
                                recordT.setValue({ fieldId: "custbody_l54_id_ret_inym", value: arrayIdYnym.toString() });

                        }
                        
                        //FIN - SE ACTUALIZAN LOS CAMPOS SUBSIDIARIA, PUNTO DE VENTA, LETRA, IMPORTE NETO A ABONAR YA QUE NO SALTA LA FUNCIONALIDAD DE ORIGEN Y FILTRACION

                        try {
                            
                            var idTmp = recordT.save();
                                        
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - SE GENERO EL VENDORPAYMENT EXITOSAMENTE. ID: " + idTmp);

                            if (!utilidades.isEmpty(cal_ret_auto) || (cal_ret_auto == "T" || cal_ret_auto == true)) {
                                //log.debug(L54 - Calcular Retenciones (SS)','AFTERSUBMIT - PROCESAVENDORPAYMENT - infoVendorPayment: '+JSON.stringify(infoVendorPayment));
                                //imprimirRetencionesAuto(recId,infoVendorPayment);
                            }

                        }
                        catch (e) {
                            log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR GENERANDO EL VENDORPAYMENT - EXCEPTION DETALLES: " + e.message);
                            objRta.error = true;
                            objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR GENERANDO EL VENDORPAYMENT - EXCEPTION DETALLES: " + e.message;
                        }
                    }
                    
                    

                    if (type == "edit") { // Alex Editar
                        var creacionJournal = false;
                        var moneda = recordT.getValue({ fieldId: "currency" });
                        var department = recordT.getValue({ fieldId: "department" });
                        var location = recordT.getValue({ fieldId: "location" });
                        var clase = recordT.getValue({ fieldId: "class" });
                        var subsidiaria = null;
                        var esOneWorld = utilidades.l54esOneworld();
                        if (esOneWorld) {
                            subsidiaria = subsidiary;
                        }

                        //OBTENGO EL JOURNAL DEL PAGO A PROVEEDOR
                        var idJournalPagoProveedor = recordT.getValue({ fieldId: "custbody_l54_id_je_vendorpayment" });
                        var monto_ret_ganancias = recordT.getValue({ fieldId: "custbody_l54_gan_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
                            monto_ret_ganancias = "0.00";

                        var monto_ret_suss = recordT.getValue({ fieldId: "custbody_l54_suss_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
                            monto_ret_suss = "0.00";

                        var monto_ret_iva = recordT.getValue({ fieldId: "custbody_l54_iva_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
                            monto_ret_iva = "0.00";

                        var monto_ret_iibb = recordT.getValue({ fieldId: "custbody_l54_iibb_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
                            monto_ret_iibb = "0.00";

                        var monto_ret_muni = recordT.getValue({ fieldId: "custbody_l54_municipal_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_muni) || isNaN(monto_ret_muni))
                            monto_ret_muni = "0.00";

                        var monto_ret_inym = recordT.getValue({ fieldId: "custbody_l54_inym_imp_a_retener" });

                        if (utilidades.isEmpty(monto_ret_inym) || isNaN(monto_ret_inym))
                            monto_ret_inym = "0.00";

                        monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
                        monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
                        monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
                        monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
                        monto_ret_muni = parseFloat(monto_ret_muni, 10).toFixed(2);
                        monto_ret_inym = parseFloat(monto_ret_inym, 10).toFixed(2);

                        var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10) + parseFloat(monto_ret_muni, 10) + parseFloat(monto_ret_inym, 10));
                        monto_ret_total = monto_ret_total.toFixed(2);
                        var importeNetoAbonar = parseFloat(parseFloat(montoTotal, 10) - parseFloat(monto_ret_total, 10), 10).toFixedOK(2);

                        log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - MONTOS USADOS EN LAS RETENCIONES GENERADAS - RETENCION TOTAL: " + monto_ret_total + " - RETENCION GANANCIAS: " + monto_ret_ganancias + " - RETENCION SUSS: " + monto_ret_suss + " - RETENCION IVA: " + monto_ret_iva + " - RETENCION IIBB: " + monto_ret_iibb);

                        if (parseFloat(monto_ret_ganancias, 10) != 0 || parseFloat(monto_ret_suss, 10) != 0 || parseFloat(monto_ret_iva, 10) != 0 || parseFloat(monto_ret_iibb, 10) != 0 || parseFloat(monto_ret_muni, 10) != 0 || parseFloat(monto_ret_inym, 10) != 0) {
                            
                            var record_journalentry = null;

                            if (!utilidades.isEmpty(idJournalPagoProveedor)) {
                                record_journalentry = record.load({
                                    type: "journalentry",
                                    id: idJournalPagoProveedor,
                                    isDynamic: true
                                });

                                //SI EXISTE JOURNAL SE BORRAN LAS LINEAS
                                var cantidadLineasJournal = record_journalentry.getLineCount("line");

                                for (var i = cantidadLineasJournal; i > 0; i--) {
                                    record_journalentry.removeLine({
                                        sublistId: "line",
                                        line: 0,
                                        ignoreRecalc: false
                                    });
                                }
                                creacionJournal = false;
                            }
                            else {
                                record_journalentry = record.create({
                                    type: record.Type.JOURNAL_ENTRY,
                                    isDynamic: true
                                });
                                creacionJournal = true;
                                configurarEstadoAprobacionJournalEntry(record_journalentry);
                                record_journalentry.setValue({ fieldId: "customform", value: formJournalEntryRetencion });
                            }
                            record_journalentry.setValue({ fieldId: "memo", value: codigo_op });
                            record_journalentry.setValue({ fieldId: "custbody_l54_op_asociado", value: codigo_op });

                            if (creacionJournal == true && !utilidades.isEmpty(subsidiaria)) {
                                record_journalentry.setValue({ fieldId: "subsidiary", value: subsidiaria });
                            }

                            record_journalentry.setValue({ fieldId: "trandate", value: trandate });
                            record_journalentry.setValue({ fieldId: "currency", value: moneda });
                            record_journalentry.setValue({ fieldId: "exchangerate", value: parseFloat(tasa_pago, 10) });

                            record_journalentry.selectNewLine("line");
                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                            if (!utilidades.isEmpty(department))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                            if (!utilidades.isEmpty(location))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                            if (!utilidades.isEmpty(clase))
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });
                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: idCuentaCont });
                            if(objDatosImpositivos[0].applyAccountClearing && paramFormaPago != formaPago){
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(montoTotal, 10) });
                            }else{
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(monto_ret_total, 10) });
                            }
                            record_journalentry.commitLine("line");

                            if(objDatosImpositivos[0].applyAccountClearing && paramFormaPago != formaPago){
                                record_journalentry.selectNewLine("line");
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                    
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });
                    
                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });
                    
                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });
                    
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                    
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: ctaBancoAuxiliar });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(importeNetoAbonar, 10) });
                                
                                record_journalentry.commitLine("line");
                            }

                            //SI TIENE RETENCIONES DE GANANCIAS
                            if (parseFloat(monto_ret_ganancias, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_ganancias, 10))) {
                                //INICIO - SE AGREGA LINEA DE RET GANANCIAS (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_ganancias });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_ganancias, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET GANANCIAS (CREDIT)
                            }

                            //SI TIENE RETENCIONES DE SUSS
                            if (parseFloat(monto_ret_suss, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_suss, 10))) {
                                //INICIO - SE AGREGA LINEA DE RET SUSS (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_suss });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_suss, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET SUSS (CREDIT)
                            }

                            //SI TIENE RETENCIONES DE IVA
                            if (parseFloat(monto_ret_iva, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_iva, 10))) {
                                //INICIO - SE AGREGA LINEA DE RET IVA (CREDIT)
                                record_journalentry.selectNewLine("line");
                                if (!utilidades.isEmpty(department))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                if (!utilidades.isEmpty(location))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                if (!utilidades.isEmpty(clase))
                                    record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: id_ret_iva });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(monto_ret_iva, 10) });
                                record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                record_journalentry.commitLine("line");
                                //FIN - SE AGREGA LINEA DE RET IVA (CREDIT)
                            }

                            //SI TIENE RETENCIONES DE IIBB
                            if ((parseFloat(monto_ret_iibb, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_iibb, 10))) || (parseFloat(monto_ret_muni, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_muni, 10))) || (parseFloat(monto_ret_inym, 10) != 0 && !utilidades.isEmpty(parseFloat(monto_ret_inym, 10)))) {
                                var importeIIBB;
                                var jurisdiccionIIBB;
                                var numLinesRetenciones = recordT.getLineCount({
                                    sublistId: "recmachcustrecord_l54_ret_ref_pago_prov"
                                });


                                for (var j = 0; !utilidades.isEmpty(numLinesRetenciones) && j < numLinesRetenciones; j++) {
                                    var tipoRetencion = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_tipo", line: j });
                                    if (tipoRetencion == 3 || tipoRetencion == 5 || tipoRetencion == 6)//IIBB
                                    {
                                        jurisdiccionIIBB = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_jurisdiccion", line: j });
                                        importeIIBB = recordT.getSublistValue({ sublistId: "recmachcustrecord_l54_ret_ref_pago_prov", fieldId: "custrecord_l54_ret_importe", line: j });
                                        var cuentaIIBB = obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB);
                                        record_journalentry.selectNewLine("line");
                                        if (!utilidades.isEmpty(department))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: department });

                                        if (!utilidades.isEmpty(location))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: location });

                                        if (!utilidades.isEmpty(clase))
                                            record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "class", value: clase });

                                        //RETENCIONES IIBB
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: codigo_op });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: cuentaIIBB });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(importeIIBB, 10) });
                                        record_journalentry.setCurrentSublistValue({ sublistId: "line", fieldId: "entity", value: entity });
                                        record_journalentry.commitLine("line");
                                    }
                                }
                            }
                            log.debug("L54 - CALCULAR RETENCIONES (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ACTUALIZACION DE DIARIO - CANTIDAD DE LINEAS FINAL: " + record_journalentry.getLineCount("line"));

                            try {
                                var idTmpJE = record_journalentry.save();
                                //recordT = aplicarJournalEntry(recordT, idTmpJE);
                                if (objDatosImpositivos[0].applyAccountClearing && paramFormaPago != formaPago) { // si se aplica clearing
                                    recordT.setValue('account', cuentaClearing);
                                }
                                log.debug("L54 - CALCULAR RETENCIONES (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - SE GENERO EL JOURNALENTRY EXITOSAMENTE - ID: " + idTmpJE);
                            }
                            catch (e) {
                                log.error("L54 - CALCULAR RETENCIONES (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR GENERANDO EL JOURNALENTRY (EDIT) - EXCEPTION DETALLES: " + e.message);
                                objRta.error = true;
                                objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR GENERANDO EL JOURNALENTRY (EDIT) - EXCEPTION DETALLES: " + e.message;
                            }

                            if (creacionJournal == true) {
                                //PARA ENVIO POR MAIL-PDF RET
                                var archivo = file.create({
                                    name: "RET PAGO " + recordT.getValue({ fieldId: "custbody_l54_numero_localizado" }) + ".pdf",
                                    fileType: file.Type.PLAINTEXT,
                                    contents: "dummy",
                                    folder: idFolderRetencion
                                });

                                var subsidiariaPDF = null;
                                var esOneWorldPDF = utilidades.l54esOneworld();
                                if (esOneWorldPDF) {
                                    subsidiariaPDF = recordT.getValue({ fieldId: "subsidiary" });
                                }

                                var idFile = archivo.save();

                                //SI SE CREO PDF SE ASOCIA A LA TRANSACCION
                                if (!utilidades.isEmpty(idFile))
                                    recordT.setValue({ fieldId: "custbody_l54_pdf_retenciones", value: idFile });
                                //FIN ENVIO POR MAIL-PDF RET

                                recordT.setValue({ fieldId: "custbody_l54_id_je_vendorpayment", value: idTmpJE });
                            }
                            recordT.setValue({ fieldId: "custbody_l54_ret_calculadas", value: true });
                            objRta.nro_asiento = idTmpJE;
                        }
                        else {
                            //SI SE CANCELARON TODAS LAS RETENCIONES , BORRO EL DIARIO O DEBERIA PONER LOS IMPORTES EN 0
                            if (!utilidades.isEmpty(idJournalPagoProveedor)) {
                                try {
                                    var deleteJE = record.delete({
                                        type: record.Type.JOURNAL_ENTRY,
                                        id: idJournalPagoProveedor,
                                    });
                                    recordT.setValue({ fieldId: "custbody_l54_id_je_vendorpayment", value: "" });
                                    recordT.setValue({ fieldId: "custbody_l54_ret_calculadas", value: false });
                                    log.debug("L54 - CALCULAR RETENCIONES (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - SE ELIMINO EL JOURNALENTRY EXITOSAMENTE - ID DEL JE ELIMINADO: " + idJournalPagoProveedor);
                                }
                                catch (e) {
                                    log.error("L54 - CALCULAR RETENCIONES (SS)", "AFTERSUBMIT - ERROR ELIMINANDO EL JOURNALENTRY - EXCEPTION DETALLES: " + e.message);
                                    objRta.error = true;
                                    objRta.mensajeError = "AFTERSUBMIT - ERROR ELIMINANDO EL JOURNALENTRY - EXCEPTION DETALLES: " + e.message;
                                }
                            }
                        }

                        //CALCULO LOS SIGUIENTES DATOS, HAYA O NO HAYA TENIDO RETENCION
                        //OBTENGO EL IMPORTE NETO A ABONAR ( TOTAL - RETENCIONES )
                        var importe_neto_a_abonar_tmp = 0.00;
                        importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(recordT.getValue({ fieldId: "total" }), 10) - (parseFloat(recordT.getValue({ fieldId: "custbody_l54_importe_total_retencion" }), 10)));

                        recordT.setValue({ fieldId: "custbody_l54_importe_neto_a_abonar", value: importe_neto_a_abonar_tmp });
                        recordT.setValue({ fieldId: "custbody_3k_neto_abonar_local_curr", value: format.format({ value: parseFloat(parseFloat(importe_neto_a_abonar_tmp, 10) * parseFloat(tasa_pago, 10), 10).toFixed(2), type: format.Type.CURRENCY }) });

                        /*RUTINA DE MONTO ESCRITO*/
                        var numeroEnLetras = getNumeroEnLetras(importe_neto_a_abonar_tmp, subsidiaria);
                        log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - NUMEROENLETRAS: " + numeroEnLetras + " - IMPORTE NETO ABONAR: " + importe_neto_a_abonar_tmp);

                        if (!utilidades.isEmpty(numeroEnLetras))
                            recordT.setValue({ fieldId: "custbody_l54_monto_escrito", value: normalize(numeroEnLetras) });
                        try {
                            var idTmp = recordT.save();
                            log.debug("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - SE ACTUALIZO EL VENDORPAYMENT EXITOSAMENTE (EDIT) - ID: " + idTmp);
                        }
                        catch (e) {
                            log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO EL VENDORPAYMENT (EDIT) - EXCEPTION DETALLES: " + e.message);
                            objRta.error = true;
                            objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - ERROR ACTUALIZANDO EL VENDORPAYMENT (EDIT) - EXCEPTION DETALLES: " + e.message;
                        }
                    }
                }
                log.audit("L54 - Calcular Retenciones (SS)", "LINE 2475 - Unidades de ejecuion restantes: " + script.getRemainingUsage());
            }
            catch (err) {
                log.error("L54 - Calcular Retenciones (SS)", "AFTERSUBMIT - PROCESAVENDORPAYMENT - Error EN PROCESAVENDORPAYMENT - EXCEPTION DETALLES: " + err.message);
                objRta.error = true;
                objRta.mensajeError = "AFTERSUBMIT - PROCESAVENDORPAYMENT - Error EN PROCESAVENDORPAYMENT - EXCEPTION DETALLES: " + err.message;
            }
            log.audit("L54 - Calcular Retenciones (SS)", "FIN - AFTERSUBMIT - PROCESAVENDORPAYMENT");
        }

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        };

        function obtenerConfRetCtaClearing (subsidiaria, moneda, cuentaBanco) {

            var proceso = 'obtenerConfRetCtaClearing';
            var respuesta = { error: false, mensaje: '', ctaClearing: '' };

            try {

                var filtros = [];

                filtros[0] = search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                });

                filtros[1] = search.createFilter({
                    name: 'custrecord_l54_config_ctas_cl_moneda',
                    operator: search.Operator.ANYOF,
                    values: moneda
                });
            
                filtros[2] = search.createFilter({
                    name: 'custrecord_l54_config_ctas_cl_sub',
                    operator: search.Operator.ANYOF,
                    values: subsidiaria
                });

                filtros[3] = search.createFilter({
                    name: 'custrecord_l54_config_ctas_cl_cuenta',
                    operator: search.Operator.ANYOF,
                    values: cuentaBanco
                });

                var ssDatosImp = search.create({
                    type: 'customrecord_l54_panel_config_ctas_cl',
                    filters: filtros,
                    columns: ['custrecord_l54_config_ctas_cl_debito']
                }).run().each(function (result) {
                    respuesta.ctaClearing = result.getValue('custrecord_l54_config_ctas_cl_debito');
                    return true;
                });

                if (respuesta.ctaClearing == '') {
                    respuesta.error = true;
                    respuesta.mensaje = 'No existe cuenta clearing para los datos enviados por parametros.';
                }
            } catch (error) {
                respuesta.mensaje = 'Error obteniendo la configuracion de cuentas clearing - Detalles:' + error.message;
                respuesta.error = true;
                log.error(proceso, respuesta.mensaje);
            }

            log.debug(proceso, 'respuesta config cuentas clearing: ${respuesta}');
            return respuesta.ctaClearing;
        }

        // Función que me devuelve la información de Datos Impositivos de la empresa según la subsidiaria.
        function consultaDatosImpositivos(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - consultaDatosImpositivos");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria: " + subsidiaria);

            var searchDatosImpositivos = search.load({
                id: "customsearch_3k_datos_imp_empresa"
            });

            if (!utilidades.isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchDatosImpositivos.filters.push(filtroSubsidiaria);
            }

            var resultSet = searchDatosImpositivos.run();

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });

            if (!utilidades.isEmpty(searchResult)) {
                if (searchResult.length > 0) {
                    var arrayDatosImpositivos = new Array();
                    var objDatosImpositivos = new Object();
                    var subsidiariaSS; // usada para logear si hay error.
                    objDatosImpositivos.subsidiariaSS = searchResult[0].getValue({
                        name: resultSet.columns[8]
                    });
                    subsidiariaSS = objDatosImpositivos.subsidiariaSS;
                    //Agente de Retención
                    objDatosImpositivos.esAgenteGanancias = searchResult[0].getValue({
                        name: resultSet.columns[12]
                    });
                    objDatosImpositivos.esAgenteIIBB = searchResult[0].getValue({
                        name: resultSet.columns[13]
                    });
                    objDatosImpositivos.esAgenteIVA = searchResult[0].getValue({
                        name: resultSet.columns[14]
                    });
                    objDatosImpositivos.esAgenteSUSS = searchResult[0].getValue({
                        name: resultSet.columns[15]
                    });
                    //Exento
                    objDatosImpositivos.exentoIIBB = searchResult[0].getValue({
                        name: resultSet.columns[16]
                    });
                    objDatosImpositivos.exentoSUSS = searchResult[0].getValue({
                        name: resultSet.columns[17]
                    });
                    objDatosImpositivos.exentoIVA = searchResult[0].getValue({
                        name: resultSet.columns[18]
                    });
                    objDatosImpositivos.exentoGanancias = searchResult[0].getValue({
                        name: resultSet.columns[19]
                    });
                    objDatosImpositivos.calRetAutomaticamente = searchResult[0].getValue({
                        name: resultSet.columns[23]
                    });
                    objDatosImpositivos.numXLocation = searchResult[0].getValue({
                        name: resultSet.columns[24]
                    });
                    objDatosImpositivos.idCCRetGAN = searchResult[0].getValue({
                        name: resultSet.columns[25]
                    });
                    objDatosImpositivos.idCCRetSUSS = searchResult[0].getValue({
                        name: resultSet.columns[27]
                    });
                    objDatosImpositivos.idCCRetIVA = searchResult[0].getValue({
                        name: resultSet.columns[29]
                    });
                    objDatosImpositivos.folderIdRetenciones = searchResult[0].getValue({
                        name: resultSet.columns[11]
                    });
                    objDatosImpositivos.applyAccountClearing = searchResult[0].getValue({
                        name: resultSet.columns[33]
                    });
                    objDatosImpositivos.formJurnalEntryRet = searchResult[0].getValue({
                        name: resultSet.columns[34]
                    });
                    arrayDatosImpositivos.push(objDatosImpositivos);
                    log.debug("L54 - Calculo Retenciones", "RETURN - arrayDatosImpositivos: " + JSON.stringify(arrayDatosImpositivos));
                    log.audit("L54 - Calculo Retenciones", "FIN - consultaDatosImpositivos");
                    return arrayDatosImpositivos;
                }
            }
            else {
                log.error("L54 - Calcular Retenciones (SS)", "No se encuentra registrada la Configuración de Datos Impositivos para la subsidiaria " + subsidiariaSS + " .");
                log.audit("L54 - Calculo Retenciones", "FIN - consultaDatosImpositivos");
                return false;
            }

        }

        function obtenerPuntoVenta(esND, subsidiaria, tipoTransStr, locationId) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerPuntoVenta");
            log.debug("L54 - Calculo Retenciones", "Parámetros - esND: " + esND + " - subsidiaria: " + subsidiaria + " - tipoTransStr: " + tipoTransStr + " - locationId: " + locationId);

            var categoriaNumerador = null;
            var resultgetTipoTransId = getTipoTransId(tipoTransStr);
            var tipoTransId = numeradorAUtilizar(resultgetTipoTransId, esND, subsidiaria);

            if (!utilidades.isEmpty(locationId)) {
                var fieldLookUp = search.lookupFields({
                    type: search.Type.LOCATION,
                    id: locationId,
                    columns: ["custrecord_l54_loc_categoria_numerador"]
                });

                if (!utilidades.isEmpty(fieldLookUp))
                    categoriaNumerador = fieldLookUp.custrecord_l54_loc_categoria_numerador;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - getBocaPreferidaParaTrans: " + getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador));
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerPuntoVenta");
            return getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador);
        }

        function getLetraId(letraStr) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getLetraId");
            log.debug("L54 - Calculo Retenciones", "Parámetros - letraStr: " + letraStr);

            var letraId = null;

            if (letraStr == "A")
                letraId = 1;
            else if (letraStr == "B")
                letraId = 2;
            else if (letraStr == "C")
                letraId = 3;
            else if (letraStr == "E")
                letraId = 4;
            else if (letraStr == "R")
                letraId = 5;
            else if (letraStr == "X")
                letraId = 6;

            log.debug("L54 - Calculo Retenciones", "RETURN - letraId: " + letraId);
            log.audit("L54 - Calculo Retenciones", "FIN - getLetraId");
            return letraId;
        }

        function loadRetenciones(idVendorPayment) {

            log.audit("L54 - Calculo Retenciones", "INICIO - loadRetenciones");
            log.debug("L54 - Calculo Retenciones", "Parámetros - idVendorPayment: " + idVendorPayment);

            var arrayRetenciones = new Array();

            //DECLARACION DEL SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_retenciones_cal_ret"
            });

            //FILTRO PAGO DE PROVEEDOR
            if (!utilidades.isEmpty(idVendorPayment)) {
                //FILTRO DE SUBSIDIARIA
                var filtroVendorPayment = search.createFilter({
                    name: "custrecord_l54_ret_ref_pago_prov",
                    operator: search.Operator.IS,
                    values: idVendorPayment
                });
                saveSearch.filters.push(filtroVendorPayment);

                var filtroIsInactive = search.createFilter({
                    name: "isinactive",
                    operator: search.Operator.IS,
                    values: "F"
                });
                saveSearch.filters.push(filtroIsInactive);

                var resultSearch = saveSearch.run();
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                var rangoInicial = 0;
                var completeResultSet = [];

                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (rangoInicial == 0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    resultIndex = resultIndex + resultStep;
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);
                rangoInicial = rangoInicial + resultStep;

                for (var i = 0; !utilidades.isEmpty(completeResultSet) && i < completeResultSet.length; i++) {
                    var objRetenciones = new Object();
                    objRetenciones.ret_id_retencion = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                    objRetenciones.ret_retencion = completeResultSet[i].getValue({ name: resultSearch.columns[1] });
                    objRetenciones.ret_jurisdiccion = completeResultSet[i].getValue({ name: resultSearch.columns[2] });
                    objRetenciones.ret_importe = completeResultSet[i].getValue({ name: resultSearch.columns[3] });
                    objRetenciones.ret_tipo = completeResultSet[i].getValue({ name: resultSearch.columns[4] });
                    objRetenciones.ret_base_calculo = completeResultSet[i].getValue({ name: resultSearch.columns[5] });
                    objRetenciones.ret_base_calculo_imp = completeResultSet[i].getValue({ name: resultSearch.columns[6] });
                    objRetenciones.ret_neto_bill_aplicado = completeResultSet[i].getValue({ name: resultSearch.columns[7] });
                    objRetenciones.ret_condicion = completeResultSet[i].getValue({ name: resultSearch.columns[8] });
                    objRetenciones.ret_tipo_contrib_iibb = completeResultSet[i].getValue({ name: resultSearch.columns[9] });
                    objRetenciones.ret_alicuota = completeResultSet[i].getValue({ name: resultSearch.columns[10] });
                    objRetenciones.ret_tipo_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[11] });
                    objRetenciones.ret_cert_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[12] });
                    objRetenciones.ret_fecha_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[13] });
                    objRetenciones.ret_tarifa = completeResultSet[i].getValue({ name: resultSearch.columns[14] });
                    objRetenciones.ret_unidad_medida = completeResultSet[i].getValue({ name: resultSearch.columns[15] });
                    arrayRetenciones.push(objRetenciones);
                }
                log.debug("L54 - Calculo Retenciones", "RETURN - arrayRetenciones: " + JSON.stringify(arrayRetenciones));
                log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
                return arrayRetenciones;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - arrayRetenciones: " + JSON.stringify(arrayRetenciones));
            log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
            return arrayRetenciones;
        }

        function parametrizacionRetenciones(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - parametrizacionRetenciones");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria: " + subsidiaria);

            var informacionCodigosVB = new Array();

            var searchParametrizacionRet = search.load({
                id: "customsearch_l54_parametrizacion_ret"
            });

            if (!utilidades.isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_param_ret_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchParametrizacionRet.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchParametrizacionRet.run();

            var completeResultSet = null;

            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }

                // increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

            //log.debug('L54 - Calcular Retenciones (SS) - LINE 1311', 'completeResultSet.length: ' +completeResultSet.length+' - completeResultSet: '+JSON.stringify(completeResultSet));

            if (!utilidades.isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    //log.debug('L54 - Calcular Retenciones (SS) - LINE 1316', 'INDICE: ' +i);
                    informacionCodigosVB[i] = new Object();
                    informacionCodigosVB[i].codigo = 0;
                    informacionCodigosVB[i].importe_factura_pagar = 0;
                    informacionCodigosVB[i].imp_retenido_anterior = 0;
                    informacionCodigosVB[i].base_calculo_retencion = 0;
                    informacionCodigosVB[i].base_calculo_retencion_impresion = 0;
                    informacionCodigosVB[i].importe_retencion = 0;
                    informacionCodigosVB[i].esFacturaM = true;
                    informacionCodigosVB[i].codigo = completeResultSet[i].getValue({
                        name: resultSearch.columns[0]
                    });

                    informacionCodigosVB[i].tipo_ret = completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    });
                    informacionCodigosVB[i].retencionM = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });
                    informacionCodigosVB[i].minNoImponible = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    }), 10).toFixedOK(2);
                    informacionCodigosVB[i].ganMonotributo = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });
                    informacionCodigosVB[i].desRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });
                    informacionCodigosVB[i].codRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[7]
                    });
                }
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - informacionCodigosVB: " + JSON.stringify(informacionCodigosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - parametrizacionRetenciones");
            return informacionCodigosVB;
        }

        function numeradorAUtilizar(tipoTransNetSuite, esND, subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - numeradorAUtilizar");
            log.debug("L54 - Calculo Retenciones", "Parámetros - esND: " + esND + " - subsidiaria: " + subsidiaria + " - tipoTransNetSuite: " + tipoTransNetSuite);

            //SI VIENE NULL SE LE ASIGNA VALOR FALSE
            if (utilidades.isEmpty(esND))
                esND = false;

            //SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_num_transac_cal_ret"
            });

            //FILTRO TIPO TRANSACCION NS
            if (!utilidades.isEmpty(tipoTransNetSuite)) {
                var filtroTipoTransNS = search.createFilter({
                    name: "custrecord_l54_tipo_trans_netsuite",
                    operator: search.Operator.IS,
                    values: tipoTransNetSuite
                });
                saveSearch.filters.push(filtroTipoTransNS);
            }

            //FILTRO ES NOTA DE DEBITO?
            if (!utilidades.isEmpty(esND)) {
                var filtroND = search.createFilter({
                    name: "custrecord_l54_es_nd",
                    operator: search.Operator.IS,
                    values: esND
                });
                saveSearch.filters.push(filtroND);
            }

            //FILTRO SUBSIDIARIA
            if (!utilidades.isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_num_trans_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                saveSearch.filters.push(filtroSubsidiaria);
            }

            var resultSearch = saveSearch.run();
            var completeResultSet = null;
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

            if (!utilidades.isEmpty(completeResultSet)) {
                if (completeResultSet.length > 0) {
                    var numerador = completeResultSet[0].getValue({
                        name: resultSearch.columns[1]
                    });
                    log.debug("L54 - Calculo Retenciones", "RETURN - numerador: " + numerador);
                    return numerador;
                }
            }
            else {
                log.debug("L54 - Calculo Retenciones", "RETURN - null");
                return null;
            }
            log.audit("L54 - Calculo Retenciones", "FIN - numeradorAUtilizar");
            return null;
        }

        function getTipoTransId(tipoTransStr) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getTipoTransId");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransStr: " + tipoTransStr);

            if (!utilidades.isEmpty(tipoTransStr)) {

                var saveSearch = search.create({
                    type: "customlist_l54_tipo_transaccion",
                    columns: [{
                        name: "internalId"
                    }],
                    filters: [{
                        name: "name",
                        operator: "is",
                        values: tipoTransStr
                    }]
                });

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                //log.debug('getTipoTransId','LINE 3550 - completeResultSet: '+JSON.stringify(completeResultSet));
                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        var internalId = completeResultSet[0].getValue({
                            name: resultSearch.columns[0]
                        });
                        log.debug("L54 - Calculo Retenciones", "RETURN - internalId: " + internalId);
                        return internalId;
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "getTipoTransId - No se encuentro el tipo de transaccion con los parametros indicados");
                    log.debug("L54 - Calculo Retenciones", "RETURN - null");
                    log.audit("L54 - Calculo Retenciones", "FIN - getTipoTransId");
                    return null;
                }
            }
            return null;
        }

        function devolverNuevoNumero(tipoTransId, boca, letra, subsidiaria, jurisdiccion) {

            log.audit("L54 - Calculo Retenciones", "INICIO - devolverNuevoNumero");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransId: " + tipoTransId + ", boca: " + boca + ", letra: " + letra + ", subsidiaria: " + subsidiaria + ", jurisdiccion: " + jurisdiccion);

            if (!utilidades.isEmpty(tipoTransId) && !utilidades.isEmpty(boca) && !utilidades.isEmpty(letra)) {

                var numeradorElectronico = false;
                var tipoMiddleware = 1;
                var tipoTransaccionAFIP = "";
                var idInternoNumerador = "";

                //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: "customsearch_l54_numeradores_cal_ret"
                });
                //FILTRO TIPO TRANSACCION
                if (!utilidades.isEmpty(tipoTransId)) {
                    var filtroTipoTrans = search.createFilter({
                        name: "custrecord_l54_num_tipo_trans",
                        operator: search.Operator.ANYOF,
                        values: tipoTransId
                    });
                    saveSearch.filters.push(filtroTipoTrans);
                }
                //FILTRO BOCA
                if (!utilidades.isEmpty(boca)) {
                    var filtroBoca = search.createFilter({
                        name: "custrecord_l54_num_boca",
                        operator: search.Operator.ANYOF,
                        values: boca
                    });
                    saveSearch.filters.push(filtroBoca);
                }
                //FILTRO LETRA
                if (!utilidades.isEmpty(letra)) {
                    var filtroLetra = search.createFilter({
                        name: "custrecord_l54_num_letra",
                        operator: search.Operator.ANYOF,
                        values: letra
                    });
                    saveSearch.filters.push(filtroLetra);
                }
                //FILTRO SUBSIDIARIA
                if (!utilidades.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_num_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }
                //FILTRO JURISDICCION
                if (!utilidades.isEmpty(jurisdiccion)) {
                    var filtroJurisdiccion = search.createFilter({
                        name: "custrecord_l54_num_jurisdiccion",
                        operator: search.Operator.IS,
                        values: jurisdiccion
                    });
                    saveSearch.filters.push(filtroJurisdiccion);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        var numerador = completeResultSet[0].getValue({ name: resultSearch.columns[1] });
                        var numeradorInicial = completeResultSet[0].getValue({ name: resultSearch.columns[2] });
                        var numeradorLong = completeResultSet[0].getValue({ name: resultSearch.columns[3] });
                        var numeradorPrefijo = completeResultSet[0].getValue({ name: resultSearch.columns[4] });
                        numeradorElectronico = completeResultSet[0].getValue({ name: resultSearch.columns[5] });
                        tipoMiddleware = completeResultSet[0].getValue({ name: resultSearch.columns[6] });
                        tipoTransaccionAFIP = completeResultSet[0].getValue({ name: resultSearch.columns[7] });
                        idInternoNumerador = completeResultSet[0].getValue({ name: resultSearch.columns[8] });
                        var recId = completeResultSet[0].getValue({ name: resultSearch.columns[8] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "devolverNuevoNumero - No se encuentro informacion de numeradores con los parametros recibidos");
                    log.debug("L54 - Calculo Retenciones", "RETURN 1");
                    log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                    return 1;
                }
                
                if (!utilidades.isEmpty(numeradorElectronico) && (numeradorElectronico == "T" || numeradorElectronico == true)) {
                    // Si es Numerador Electronico
                    var numeradorArray = new Array();
                    numeradorArray["referencia"] = idInternoNumerador;
                    numeradorArray["numerador"] = ""; // numerador
                    numeradorArray["numeradorPrefijo"] = ""; // prefijo + numerador
                    numeradorArray["numeradorElectronico"] = "T";
                    numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                    log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray: " + JSON.stringify(numeradorArray));
                    log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                    return numeradorArray;
                }
                else {
                    if (utilidades.isEmpty(numerador)) {
                        //nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numeradorInicial) + 1]);
                        var contador = parseInt(numeradorInicial) + 1;

                        record.submitFields({
                            type: "customrecord_l54_numeradores",
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        numerador = numeradorInicial;
                    }
                    else {
                        //nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numerador) + 1]);
                        var contador = parseInt(numerador) + 1;
                        record.submitFields({
                            type: "customrecord_l54_numeradores",
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                    var numerador = zeroFill(numerador, numeradorLong);

                    if (!utilidades.isEmpty(numeradorPrefijo)) {
                        var numeradorArray = new Array();
                        numeradorArray["referencia"] = idInternoNumerador;
                        numeradorArray["numerador"] = numerador.toString(); // numerador
                        numeradorArray["numeradorPrefijo"] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
                        numeradorArray["numeradorElectronico"] = "F";
                        numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                        log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray1: " + JSON.stringify(numeradorArray));
                        log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                        return numeradorArray;
                    } else {

                        var numeradorArray = new Array();
                        numeradorArray["referencia"] = idInternoNumerador;
                        numeradorArray["numerador"] = numerador.toString(); // numerador
                        numeradorArray["numeradorPrefijo"] = numerador.toString(); // prefijo + numerador
                        numeradorArray["numeradorElectronico"] = "F";
                        numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                        log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray2: " + JSON.stringify(numeradorArray));
                        log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                        return numeradorArray;
                    }
                }
            } else {
                var numeradorArray = new Array();
                numeradorArray["referencia"] = idInternoNumerador;
                numeradorArray["numerador"] = ""; // numerador
                numeradorArray["numeradorPrefijo"] = ""; // prefijo + numerador
                numeradorArray["numeradorElectronico"] = "F";
                numeradorArray["tipoTransAFIP"] = "";
                log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray3: " + JSON.stringify(numeradorArray));
                log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                return numeradorArray;
            }
        }
        function obtenerArraysCuentas(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerArraysCuentaIIBB");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria:" + subsidiaria);

           
            var idConfGeneral = null;
                //SAVE SEARCH A EJECUTAR
                /* Optimizando codigo
                var saveSearch = search.load({
                    id: "customsearch_l54_pv_iibb_config_general"
                });
                //FILTRO SUBSIDIARIA
                if (!utilidades.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_gral_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        idConfGeneral = completeResultSet[0].getValue({ name: resultSearch.columns[0] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "obtenerCuentaIIBB - No se encuentro informacion de Configuración General IIBB");
                    log.debug("L54 - Calculo Retenciones", "RETURN NULL");
                    log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                    return null;
                }*/


                //if (!utilidades.isEmpty(idConfGeneral) && idConfGeneral > 0) {
                    //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: "customsearch_l54_iibb_config_detalle"
                });

                if (!utilidades.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_gral_subsidiaria",
                        join: "custrecord_l54_pv_det_link_padre",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }

                //FILTRO ID CONFIG GENERAL
                if (!utilidades.isEmpty(idConfGeneral)) {
                    var filtroConfGeneral = search.createFilter({
                        name: "custrecord_l54_pv_det_link_padre",
                        operator: search.Operator.IS,
                        values: idConfGeneral
                    });
                    saveSearch.filters.push(filtroConfGeneral);
                }
                //FILTRO JURISDICCION
                /*if (!utilidades.isEmpty(jurisdiccionIIBB)) {
                    var filtroJurisdiccion = search.createFilter({
                        name: "custrecord_l54_pv_det_jurisdiccion",
                        operator: search.Operator.IS,
                        values: jurisdiccionIIBB
                    });
                    saveSearch.filters.push(filtroJurisdiccion);
                }*/

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                var idCuenta = 0;
                var jurisdiccion = '';
                var arrayCuentas = []

                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {

                        for (var i = 0; i < completeResultSet.length; i++) {

                            idCuenta = completeResultSet[i].getValue({
                                name: resultSearch.columns[3]
                            });
                            
                            jurisdiccion = completeResultSet[i].getValue({
                                name: resultSearch.columns[5]
                            });

                            arrayCuentas.push({
                                idCuenta: idCuenta,
                                jurisdiccion: jurisdiccion
                            })
                        }
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "No se encuentro informacion de Configuración General IIBB");
                    log.error("L54 - Calculo Retenciones", "o - No se encuentro informacion de IIBB Configuración Detalle");
                    log.debug("L54 - Calculo Retenciones", "RETURN - idCuenta:" + idCuenta);
                    log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                    return arrayCuentas;
                }
                
            
            log.debug("L54 - Calculo Retenciones", "RETURN - arrayCuentas:" + arrayCuentas);
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
            return arrayCuentas;
        }

        function obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerCuentaIIBB");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria:" + subsidiaria + ",jurisdiccionIIBB:" + jurisdiccionIIBB);

            var idCuenta = 0;
            var idConfGeneral = null;
            if (!utilidades.isEmpty(jurisdiccionIIBB)) {
                //SAVE SEARCH A EJECUTAR
                /* Optimizando codigo
                var saveSearch = search.load({
                    id: "customsearch_l54_pv_iibb_config_general"
                });
                //FILTRO SUBSIDIARIA
                if (!utilidades.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_gral_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        idConfGeneral = completeResultSet[0].getValue({ name: resultSearch.columns[0] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "obtenerCuentaIIBB - No se encuentro informacion de Configuración General IIBB");
                    log.debug("L54 - Calculo Retenciones", "RETURN NULL");
                    log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                    return null;
                }*/


                //if (!utilidades.isEmpty(idConfGeneral) && idConfGeneral > 0) {
                    //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: "customsearch_l54_iibb_config_detalle"
                });

                if (!utilidades.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_gral_subsidiaria",
                        join: "custrecord_l54_pv_det_link_padre",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }

                //FILTRO ID CONFIG GENERAL
                if (!utilidades.isEmpty(idConfGeneral)) {
                    var filtroConfGeneral = search.createFilter({
                        name: "custrecord_l54_pv_det_link_padre",
                        operator: search.Operator.IS,
                        values: idConfGeneral
                    });
                    saveSearch.filters.push(filtroConfGeneral);
                }
                //FILTRO JURISDICCION
                if (!utilidades.isEmpty(jurisdiccionIIBB)) {
                    var filtroJurisdiccion = search.createFilter({
                        name: "custrecord_l54_pv_det_jurisdiccion",
                        operator: search.Operator.IS,
                        values: jurisdiccionIIBB
                    });
                    saveSearch.filters.push(filtroJurisdiccion);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

                if (!utilidades.isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        idCuenta = completeResultSet[0].getValue({ name: resultSearch.columns[3] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "No se encuentro informacion de Configuración General IIBB");
                    log.error("L54 - Calculo Retenciones", "o - No se encuentro informacion de IIBB Configuración Detalle");
                    log.debug("L54 - Calculo Retenciones", "RETURN - idCuenta:" + idCuenta);
                    log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                    return idCuenta;
                }
                
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - idCuenta:" + idCuenta);
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
            return idCuenta;
        }

        function redondeo2decimales(numero) {
            log.audit("L54 - Calculo Retenciones", "INICIO - redondeo2decimales");
            log.debug("L54 - Calculo Retenciones", "Parámetros - numero: " + numero);

            var result = parseFloat(Math.round(parseFloat(numero) * 100) / 100).toFixed(2);

            log.debug("L54 - Calculo Retenciones", "RETURN - result: " + result);
            log.audit("L54 - Calculo Retenciones", "FIN - redondeo2decimales");
            return result;
        }

        function getNumeroEnLetras(numero) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getNumeroEnLetras");
            log.debug("L54 - Calculo Retenciones", "Parámetros - numero: " + numero);

            if (!utilidades.isEmpty(numero)) {

                //var currency_name = 'PESOS';
                var partes = numero.split(".");
                var parteEntera = partes[0];
                var parteDecimal = partes[1];
                var parteEnteraLetras = "";

                // convierto la parte entera en letras
                parteEnteraLetras = getNumberLiteral(parteEntera);
                // le hago un TRIM a la parte entera en letras
                parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

                var numeroEnLetras = "Son " + parteEnteraLetras + " con " + parteDecimal;

                // dejo toda la palabra en mayusculas
                numeroEnLetras = numeroEnLetras.toUpperCase();

                // le agrego MN (Moneda Nacional) al final
                numeroEnLetras = numeroEnLetras + "/100";
                log.debug("L54 - Calculo Retenciones", "RETURN - numeroEnLetras: " + numeroEnLetras);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumeroEnLetras");

                return numeroEnLetras;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN  NULL");
            log.audit("L54 - Calculo Retenciones", "FIN - getNumeroEnLetras");
            return null;
        }

        function getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getBocaPreferidaParaTrans");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransId: " + tipoTransId + "- subsidiaria: " + subsidiaria + " - categoriaNumerador: " + categoriaNumerador);
            var i = 0;

            if (utilidades.isEmpty(tipoTransId))
                return 1;

            //SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_numeradores_cal_ret"
            });

            //FILTRO TIPO TRANSACCION
            if (!utilidades.isEmpty(tipoTransId)) {
                var filtroTipoTrans = search.createFilter({
                    name: "custrecord_l54_num_tipo_trans",
                    operator: search.Operator.ANYOF,
                    values: tipoTransId
                });
                saveSearch.filters.push(filtroTipoTrans);
            }

            //FILTRO SUBSIDIARIA
            if (!utilidades.isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_num_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                saveSearch.filters.push(filtroSubsidiaria);
            }

            //FILTRO PREFERIDO
            var filtroPreferido = search.createFilter({
                name: "custrecord_l54_num_preferido",
                operator: search.Operator.IS,
                values: true
            });
            saveSearch.filters.push(filtroPreferido);

            var objDatosImpositivos = consultaDatosImpositivos(subsidiaria);
            var numXLocation = false;
            var numXLocation = objDatosImpositivos[0].numXLocation;
            //log.debug('getBocaPreferidaParaTrans','LINE 3618 - numXLocation: '+numXLocation);

            //Si la empresa utiliza numeracion por location, filtro categoria de numerador
            if (numXLocation) {
                if (utilidades.isEmpty(categoriaNumerador))
                    categoriaNumerador = "@NONE@";
            }
            else {
                categoriaNumerador = "@NONE@"; //Como la empresa no utiliza numerador por location, busco el numerador sin categoria
            }

            //FILTRO CATEGORIA NUMERADOR
            if (!utilidades.isEmpty(categoriaNumerador)) {
                var filtroCatNumerador = search.createFilter({
                    name: "custrecord_l54_num_categoria_numerador",
                    operator: search.Operator.IS,
                    values: categoriaNumerador
                });
                saveSearch.filters.push(filtroCatNumerador);
            }

            var resultSearch = saveSearch.run();
            var completeResultSet = null;
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!utilidades.isEmpty(resultado) && resultado.length > 0);

            //log.debug('getBocaPreferidaParaTrans','LINE 3667 - completeResultSet: '+JSON.stringify(completeResultSet));
            if (!utilidades.isEmpty(completeResultSet)) {
                if (completeResultSet.length > 0) {
                    var boca = completeResultSet[0].getValue({
                        name: resultSearch.columns[0]
                    });
                    log.debug("L54 - Calculo Retenciones", "RETURN - boca: " + boca);
                    log.audit("L54 - Calculo Retenciones", "FIN - getBocaPreferidaParaTrans");
                    return boca;
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "getBocaPreferidaParaTrans - No se encuentro informacion de numeradores con los parametros recibidos");
                log.debug("L54 - Calculo Retenciones", "RETURN 1");
                log.audit("L54 - Calculo Retenciones", "FIN - getBocaPreferidaParaTrans");
                return 1;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN 1");
            return 1; // Boca default: 0001
        }

        function zeroFill(number, width) {
            log.audit("L54 - Calculo Retenciones", "INICIO - zeroFill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - number: " + number + "width: " + width);
            width -= number.toString().length;
            if (width > 0) {
                return new Array(width + (/\./.test(number) ? 2 : 1)).join("0") + number;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - number: " + number);
            log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
            return number;
        }

        function getNumberLiteral(n) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getNumberLiteral");
            log.debug("L54 - Calculo Retenciones", "Parámetros - n: " + n);

            var m0,
                cm,
                dm,
                um,
                cmi,
                dmi,
                umi,
                ce,
                de,
                un,
                hlp,
                decimal;

            if (isNaN(n)) {

                alert("La Cantidad debe ser un valor NumÃ©rico.");
                log.debug("L54 - Calculo Retenciones", "RETURN - null");
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return null;
            }
            m0 = parseInt(n / 1000000000000);
            rm0 = n % 1000000000000;
            m1 = parseInt(rm0 / 100000000000);
            rm1 = rm0 % 100000000000;
            m2 = parseInt(rm1 / 10000000000);
            rm2 = rm1 % 10000000000;
            m3 = parseInt(rm2 / 1000000000);
            rm3 = rm2 % 1000000000;
            cm = parseInt(rm3 / 100000000);
            r1 = rm3 % 100000000;
            dm = parseInt(r1 / 10000000);
            r2 = r1 % 10000000;
            um = parseInt(r2 / 1000000);
            r3 = r2 % 1000000;
            cmi = parseInt(r3 / 100000);
            r4 = r3 % 100000;
            dmi = parseInt(r4 / 10000);
            r5 = r4 % 10000;
            umi = parseInt(r5 / 1000);
            r6 = r5 % 1000;
            ce = parseInt(r6 / 100);
            r7 = r6 % 100;
            de = parseInt(r7 / 10);
            r8 = r7 % 10;
            un = parseInt(r8 / 1);

            //r9=r8%1;
            999123456789;
            if (n < 1000000000000 && n >= 1000000000) {

                tmp = n.toString();
                s = tmp.length;
                tmp1 = tmp.slice(0, s - 9);
                tmp2 = tmp.slice(s - 9, s);

                tmpn1 = getNumberLiteral(tmp1);
                tmpn2 = getNumberLiteral(tmp2);

                if (tmpn1.indexOf("Un") >= 0)
                    pred = " BILLÃ“N ";
                else
                    pred = " BILLONES ";

                log.debug("L54 - Calculo Retenciones", "RETURN: " + tmpn1 + pred + tmpn2);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return tmpn1 + pred + tmpn2;
            }

            if (n < 10000000000 && n >= 1000000) {

                mldata = letras(cm, dm, um);
                hlp = mldata.replace("UN", "*");
                if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

                    mldata = mldata.replace("UNO", "UN");
                    mldata += " MILLONES ";
                } else
                    mldata = "UN MILLÃ“N ";

                mdata = letras(cmi, dmi, umi);
                cdata = letras(ce, de, un);

                if (mdata != "  ") {
                    if (n == 1000000)
                        mdata = mdata.replace("UNO", "UN") + "DE";
                    else
                        mdata = mdata.replace("UNO", "UN") + " MIL ";
                }

                log.debug("L54 - Calculo Retenciones", "RETURN: " + mldata + mdata + cdata);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return (mldata + mdata + cdata);
            }
            if (n < 1000000 && n >= 1000) {

                mdata = letras(cmi, dmi, umi);
                cdata = letras(ce, de, un);
                hlp = mdata.replace("UN", "*");
                if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

                    mdata = mdata.replace("UNO", "UN");
                    log.debug("L54 - Calculo Retenciones", "RETURN: " + mdata + " MIL " + cdata);
                    log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                    return (mdata + " MIL " + cdata);
                } else
                    log.debug("L54 - Calculo Retenciones", "RETURN: UN MIL " + cdata);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return ("UN MIL " + cdata);
            }

            if (n < 1000 && n >= 1) {

                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return (letras(ce, de, un));
            }

            if (n == 0) {

                log.debug("L54 - Calculo Retenciones", "RETURN CERO");
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return " CERO";
            }

            return "NO DISPONIBLE";
        }

        function letras(c, d, u) {

            log.audit("L54 - Calculo Retenciones", "INICIO - letras");
            log.debug("L54 - Calculo Retenciones", "Parámetros - c: " + c + ", d: " + d + ", u: " + u);

            var centenas,
                decenas,
                decom;
            var lc = "";
            var ld = "";
            var lu = "";
            centenas = eval(c);
            decenas = eval(d);
            decom = eval(u);

            switch (centenas) {

                case 0:
                    lc = "";
                    break;
                case 1: {
                    if (decenas == 0 && decom == 0)
                        lc = "CIEN";
                    else
                        lc = "CIENTO ";
                }
                    break;
                case 2:
                    lc = "DOSCIENTOS ";
                    break;
                case 3:
                    lc = "TRESCIENTOS ";
                    break;
                case 4:
                    lc = "CUATROCIENTOS ";
                    break;
                case 5:
                    lc = "QUINIENTOS ";
                    break;
                case 6:
                    lc = "SEISCIENTOS ";
                    break;
                case 7:
                    lc = "SETECIENTOS ";
                    break;
                case 8:
                    lc = "OCHOCIENTOS ";
                    break;
                case 9:
                    lc = "NOVECIENTOS ";
                    break;
            }

            switch (decenas) {

                case 0:
                    ld = "";
                    break;
                case 1: {
                    switch (decom) {

                        case 0:
                            ld = "DIEZ";
                            break;
                        case 1:
                            ld = "ONCE";
                            break;
                        case 2:
                            ld = "DOCE";
                            break;
                        case 3:
                            ld = "TRECE";
                            break;
                        case 4:
                            ld = "CATORCE";
                            break;
                        case 5:
                            ld = "QUINCE";
                            break;
                        case 6:
                            ld = "DIECISEIS";
                            break;
                        case 7:
                            ld = "DIECISIETE";
                            break;
                        case 8:
                            ld = "DIECIOCHO";
                            break;
                        case 9:
                            ld = "DIECINUEVE";
                            break;
                    }
                }
                    break;
                case 2:
                    ld = "VEINTE";
                    break;
                case 3:
                    ld = "TREINTA";
                    break;
                case 4:
                    ld = "CUARENTA";
                    break;
                case 5:
                    ld = "CINCUENTA";
                    break;
                case 6:
                    ld = "SESENTA";
                    break;
                case 7:
                    ld = "SETENTA";
                    break;
                case 8:
                    ld = "OCHENTA";
                    break;
                case 9:
                    ld = "NOVENTA";
                    break;
            }
            switch (decom) {

                case 0:
                    lu = "";
                    break;
                case 1:
                    lu = "UN";
                    break;
                case 2:
                    lu = "DOS";
                    break;
                case 3:
                    lu = "TRES";
                    break;
                case 4:
                    lu = "CUATRO";
                    break;
                case 5:
                    lu = "CINCO";
                    break;
                case 6:
                    lu = "SEIS";
                    break;
                case 7:
                    lu = "SIETE";
                    break;
                case 8:
                    lu = "OCHO";
                    break;
                case 9:
                    lu = "NUEVE";
                    break;
            }

            if (decenas == 1) {
                log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld: " + lc + ld);
                log.audit("L54 - Calculo Retenciones", "FIN - letras");
                return lc + ld;
            }
            if (decenas == 0 || decom == 0) {

                //return lc+" "+ld+lu;
                log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + lu: " + lc + ld + lu);
                log.audit("L54 - Calculo Retenciones", "FIN - letras");
                return lc + ld + lu;
            } else {

                if (decenas == 2) {
                    ld = "VEINTI";
                    log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + lu.toLowerCase(): " + lc + ld + lu.toLowerCase());
                    log.audit("L54 - Calculo Retenciones", "FIN - letras");
                    return lc + ld + lu.toLowerCase();
                } else {
                    log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + \" Y \" + lu: " + lc + ld + " Y " + lu);
                    log.audit("L54 - Calculo Retenciones", "FIN - letras");
                    return lc + ld + " Y " + lu;
                }
            }
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

        function isEmpty(val) {
            return val === "" || val === undefined || val === "undefined" || val === null || val === "null" || (val.length === 0) || (typeof val == "object" && Object.keys(val).length === 0);
        }

        //Identifica si una Fecha String es una fecha valida para ser convertida
        function isDate(fecha) {
            return fecha instanceof Date && !isNaN(fecha.valueOf());
        }

        function guardarRetenciones(datosRetencion, paramRetenciones, entity, id_posting_period, tasa_cambio_pago, moneda, fecha, esRetIIBB) {

            var proceso = "guardarRetenciones";

            try {
                var objRetencion = {};

                var resultInfoCodRetencion = paramRetenciones.filter(function (obj) {
                    return (obj.codigo == datosRetencion.tipo_ret);
                });

                if (!utilidades.isEmpty(resultInfoCodRetencion) && resultInfoCodRetencion.length > 0) {
                    objRetencion.custrecord_l54_ret_codigo_int = resultInfoCodRetencion[0].codRetencion;
                    objRetencion.custrecord_l54_ret_tipo = resultInfoCodRetencion[0].tipo_ret;
                    objRetencion.custrecord_l54_ret_descrip_ret = resultInfoCodRetencion[0].desRetencion;
                }

                objRetencion.custrecord_l54_ret_cod_retencion = datosRetencion.tipo_ret;
                objRetencion.custrecord_l54_ret_importe = datosRetencion.imp_retencion;
                objRetencion.custrecord_l54_ret_base_calculo = datosRetencion.base_calculo;
                objRetencion.custrecord_l54_ret_base_calculo_imp = datosRetencion.base_calculo_imp;
                objRetencion.custrecord_l54_ret_ref_proveedor = entity;
                objRetencion.custrecord_l54_ret_anulado = false;
                objRetencion.custrecord_l54_ret_eliminado = false;
                objRetencion.custrecord_l54_ret_periodo = id_posting_period;
                objRetencion.custrecord_l54_ret_neto_bill_aplicado = datosRetencion.neto_bill;
                objRetencion.custrecord_l54_ret_tipo_cambio = tasa_cambio_pago;
                objRetencion.custrecord_l54_ret_moneda = moneda;
                objRetencion.custrecord_l54_ret_condicion = datosRetencion.condicion;
                objRetencion.custrecord_l54_ret_fecha = fecha;
                objRetencion.custrecord_l54_ret_alicuota = parseFloat(datosRetencion.alicuota, 10);
                objRetencion.custrecord_l54_ret_base_calculo_original = datosRetencion.base_calculo_original;
                objRetencion.custrecord_l54_ret_monto_suj_ret_mon_loc = datosRetencion.monto_suj_ret_moneda_local;
                objRetencion.custrecord_l54_ret_importe_ret_original = datosRetencion.imp_retencion_original;
                objRetencion.custrecord_l54_ret_diferencia_redondeo = datosRetencion.diferenciaRedondeo;
                objRetencion.isinactive = true;

                // RETENCION IIBB
                if (esRetIIBB) {
                    objRetencion.custrecord_l54_ret_jurisdiccion = datosRetencion.jurisdiccion;

                    objRetencion.custrecord_l54_ret_tipo_exencion = datosRetencion.tipoExencion;
                    objRetencion.custrecord_l54_ret_cert_exencion = datosRetencion.certExencion;

                    if ((datosRetencion.retencion == 3 || datosRetencion.retencion == 5 || datosRetencion.retencion == 6) && !utilidades.isEmpty(datosRetencion.condicionID)) {
                        objRetencion.custrecord_l54_ret_tipo_contrib_iibb = datosRetencion.condicionID;
                    }

                    if (!utilidades.isEmpty(datosRetencion.fcaducidadExencion)) {
                        //log.error('beforeSubmit', 'fechaExencion: ' + fechaExencion);
                        datosRetencion.fcaducidadExencion = new Date(datosRetencion.fcaducidadExencion);
                        //log.error('beforeSubmit', 'fechaExencion con new Date: ' + fechaExencion);
                        var fechaExencionString = format.parse({
                            value: datosRetencion.fcaducidadExencion,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                        });
                        //log.error('beforeSubmit', 'fechaExencionString: ' + fechaExencionString);
                        objRetencion.custrecord_l54_ret_fecha_exencion = fechaExencionString;
                    }
                }

                try {
                    var recordRetencion = record.create({
                        type: "customrecord_l54_retencion",
                    });

                    for (var key in objRetencion) {
                        recordRetencion.setValue(key, objRetencion[key]);
                    }

                    var idRet = recordRetencion.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.debug(proceso, "Se creo el registro de retencion de manera correcta - Detalle idRet: " + idRet);
                    return idRet;
                } catch (error) {
                    log.error(proceso, "Error al intentar crear retenciones - Detalles: " + error.message);
                }
            } catch (error) {
                log.error(proceso, "Error NetSuite Excepcion - guardarRetenciones - Detalles: " + error.message);
            }
            return null;
        }

        function eliminarRetencionesCSV(arrayRetenciones) {

            var proceso = "eliminarRetencionesCSV";

            try {
                log.debug(proceso, "arrayRetencionesCSV a eliminar: " + JSON.stringify(arrayRetenciones));
                if (!utilidades.isEmpty(arrayRetenciones)) {
                    for (var i = 0; i < arrayRetenciones.length; i++) {
                        try {
                            record.delete({
                                type: "customrecord_l54_retencion",
                                id: arrayRetenciones[i]
                            });
                        } catch (e) {
                            log.error(proceso, "Error eliminando la retencion con ID: " + arrayRetenciones[i] + " - Detalles del error: " + e.message);
                        }
                    }
                }
            } catch (error) {
                log.error(proceso, "Error NetSuite Excepcion - eliminarRetencionesCSV - Detalles: " + error.message);
            }
        }

        function configurarEstadoAprobacionJournalEntry(record_journalentry) {
            var configRecObj = config.load({
                type: config.Type.ACCOUNTING_PREFERENCES
            });
            var tieneEstadosDeAprobacionLosAsientos = configRecObj.getValue({ fieldId: "CUSTOMAPPROVALJOURNAL" });
            log.audit("tieneEstadosDeAprobacionLosAsientos", tieneEstadosDeAprobacionLosAsientos);
            if (tieneEstadosDeAprobacionLosAsientos !== true) {
                return;
            }
            var estadoPorDefectoAsiento = runtime.getCurrentScript().getParameter({ name: "custscript_l54_calcular_ret_ss_estado_ap" });
            if (utilidades.isEmpty(estadoPorDefectoAsiento)) {
                log.audit("parametro de script custscript_l54_calcular_ret_ss_estado_ap es vacio", "se utilizara el valor predeterminado que seleccione netsuite");
                return;
            }
            record_journalentry.setValue({ fieldId: "approvalstatus", value: estadoPorDefectoAsiento });
        }

        /**
         * Debe llamarse despues de guardar la journal, y volverla a cargar
         */
        function aplicarJournalEntry(recordT, journalEntryID) {
            recordT = record.load({
                type: recordT.type,
                id: recordT.id,
                isDynamic: true,
            });
            log.audit("aplicarJournalEntry", "inicio funcion");
            var cantidadItems = recordT.getLineCount({ sublistId: "apply" });
            log.audit("aplicarJournalEntry", "cantidadItems= " + cantidadItems);
            for (var j = 0; j < cantidadItems; j++) {
                var aplicado = recordT.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
                var id = recordT.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
                log.audit("aplicarJournalEntry", "se encontro en journalEntryID= " + journalEntryID + " aplicado= " + aplicado + " id= " + id);
                if (id == journalEntryID) {
                    if (aplicado == "F" || aplicado == false) {
                        recordT.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: true });
                    }
                }
            }
            log.audit("aplicarJournalEntry", "fin funcion");
            return recordT;
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });