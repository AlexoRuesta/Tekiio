/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@NAmdConfig /SuiteScripts/L54 - configuration.json
 */
define(["N/record", "N/runtime", "N/email", "N/error", "N/file", "N/format", "N/search", "N/url", "N/render", "L54/utilidades", "LIB - Search"],

    function (record, runtime, email, error, file, format, search, url, render, utilities, libSearch) {

        const proceso = "Generación Archivo Pagos Industrial (MR)";

        let { InitSearch } = libSearch;
            InitSearch = new InitSearch();

        String.prototype.lpad = function (padString, length) {
            var str = this;
            while (str.length < length)
                str = padString + str;
            return str;
        }

        function getParameters() {
            try {
                var informacion = new Object();
                var currScript = runtime.getCurrentScript();

                informacion.pagos = currScript.getParameter("custscript_l54_txt_industrial_mr_pagos");
                informacion.usuario = currScript.getParameter("custscript_l54_txt_industrial_mr_userd");
                informacion.subsidiaria = currScript.getParameter("custscript_l54_txt_industrial_mr_subs");
                informacion.fechaCabecera = currScript.getParameter("custscript_l54_txt_industrial_mr_fecha");
                informacion.datoBancario = currScript.getParameter("custscript_l54_txt_industrial_mr_dbco");
                informacion.moneda = currScript.getParameter("custscript_l54_txt_industrial_mr_curr");
                informacion.banco = currScript.getParameter("custscript_l54_txt_industrial_mr_bank");

                log.audit(proceso, "Parámetros recibidos: " + JSON.stringify(informacion));
                return informacion;
            } catch (excepcion) {
                log.error("getParameters", "INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }

        const getInputData = () => {

            try {
                log.audit(proceso, "GetInputData - INICIO");

                let params = getParameters();

                if (utilities.isEmpty(params) || utilities.isEmpty(params.pagos) || utilities.isEmpty(params.usuario) || utilities.isEmpty(params.subsidiaria) || utilities.isEmpty(params.fechaCabecera)) {
                    log.error(proceso, "Error obteniendo alguno de los campos enviados por parámetros, el proceso no puede continuar");
                    return false;
                }
                    
                const filtros = buildFilters(params);
                let filters = filtros.map(n => InitSearch.getFilter(n.name, n.operator, n.values, n.formula));
                
                const savedSearch = InitSearch.getSavedSearch("customsearch_l54_industrial_file_pagos", filters);
                
                return savedSearch;

            } catch (error) {
                log.error("GetInputData - Error", "Error obteniendo la información del suitelet y/o busquedas:" + error);
            }
        }

        function map(context) {
            try {
                log.audit(proceso, "Map - INICIO");

                let result = JSON.parse(context.value);
                log.debug("result", JSON.stringify(result));
                let objMap = {};

                if (!utilities.isEmpty(result)){
                    objMap.identificadorCliente = result.values["internalid.vendor"].value;
                    objMap.razonSocial = result.values["formulatext"];
                    objMap.cbu = result.values["custbody_l54_clave_banc_uniforme"];
                    objMap.importe = result.values["custbody_l54_importe_neto_a_abonar"];
                    objMap.nReferencia = result.values["custbody_l54_numero_localizado"];
                    objMap.observaciones = result.values["memo"] || "";
                    objMap.cuitProveedor = result.values["custbody_54_cuit_entity"];
                    objMap.internalID = result.id;
                }

                context.write(1, objMap);
                log.audit(proceso, "Map - FIN");

            } catch (error) {
                log.error("Map Error", error.message);
            }
        }

        const reduce = (context) => {
            const FN = "reduce";
            var respuesta = { "error": false, "idClave": context.key, "detalles_errores": [], "print":"", "length": 0, "amountTotal": 0};
            try {
                let parameters = getParameters();

                if (!utilities.isEmpty(context.values) && context.values.length > 0) {
                    var dataPrint = "",
                        amountTotal = 0.00
                        contador = 0;
                    for (var i = 0; i < context.values.length; i++) { 
                        let arrayData = new Array(),
                            data = JSON.parse(context.values[i]);

                        log.debug("data", data)

                        arrayData[0] = "RT";
                        arrayData[1] = "";
                        arrayData[2] = data.identificadorCliente;
                        arrayData[3] = data.cuitProveedor;
                        arrayData[4] = data.razonSocial;
                        arrayData[5] = data.cbu;
                        arrayData[6] = parameters.fechaCabecera;
                        arrayData[7] = parameters.moneda;
                        arrayData[8] = data.importe;
                        arrayData[9] = data.nReferencia;
                        arrayData[10] = data.observaciones;

                        amountTotal = parseFloat(amountTotal, 10) + parseFloat(data.importe, 10);

                        dataPrint += arrayData + "\n";

                        try {
                            let updPago = record.submitFields({
                                type: "vendorpayment",
                                id: data.internalID,
                                values: {
                                    custbody_l54_txt_file_procesado: true,
                                    custbody_l54_txt_file_fecha: parameters.fechaCabecera
                                },
                                options: {
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                }
                            });

                            if (utilities.isEmpty(updPago)) {
                                log.error(proceso, "Error Sumarize - Error : No se actualizó el Pago con ID Interno; " + data.id + ".");
                            }
                        } catch (error) {
                            log.error(proceso + FN, "Excepcion Inesperada al actualizar el Pago con ID Interno: " + data.id + " - Excepcion : " + error.message);
                            respuesta.error = true;
                            mensaje = "Excepcion Inesperada - Mensaje: " + error.message + ", key: " + context.key;
                            respuesta.detalles_errores.push(mensaje);
                        }
                        contador++
                    }
                    respuesta.print = dataPrint;
                    respuesta.length = contador;
                    respuesta.amountTotal = amountTotal;

                }

                // if(!utilities.isEmpty(configuration) && configuration.length != 0){
                //     let arrayPrint = new Array(),
                //         arrayPrintEnd = new Array(),
                //         print = "";

                //     arrayPrint[0] = configuration[0].col_2;
                //     arrayPrint[1] = "PAGO";
                //     arrayPrint[2] = configuration[0].col_11;
                //     arrayPrint[2] = "\n";
                   

                //     arrayPrintEnd[0] = configuration[0].col_6;
                //     arrayPrintEnd[1] = context.values.length;
                //     arrayPrintEnd[2] = amountTotal;

                //     print += arrayPrint;
                //     print += dataPrint;
                //     print += arrayPrintEnd;

                //     let objFile = file.create({
                //         name: configuration[0].col_7 + "_" + parameters.fechaCabecera + ".csv",
                //         fileType: file.Type.CSV,
                //         contents: print,
                //         folder: configuration[0].col_8,
                //     });

                //     let saveFile = objFile.save();
                //     log.debug("saveFile", saveFile);
                // }
               
            } catch (error) {
                log.error("REDUCE Error", error.message);
                respuesta.error = true;
                mensaje = "Excepcion Inesperada - Mensaje: " + error.message + ", key: " + context.key;
                respuesta.detalles_errores.push(mensaje);
            }
            context.write(context.key, respuesta);
        };


        function summarize(summary) {
            try {
                let parameters = getParameters(),
                    configuration = getConfiguration(parameters);
                let totalReduceErrors = 0,
                    author = parameters.usuario,
                    recipients = parameters.usuario,
                    subject = proceso,
                    errorReduce = false,
                    objResp = {},
                    respuesta = {};

                 summary.output.iterator().each(function (key, value) {

                    objResp = JSON.parse(value);

                    log.debug(proceso, "objResp: " + JSON.stringify(objResp));

                    if (objResp.error == true) {
                        errorReduce = true;
                        totalReduceErrors++;
                        arrayReduceErrors.push({ "ID Clave": objResp.idClave, "Detalle": objResp.detalles_errores });
                    }

                    return true;
                });

                if(!utilities.isEmpty(configuration) && configuration.length != 0 && objResp.print != ""){
                    let arrayPrint = new Array(),
                        arrayPrintEnd = new Array(),
                        print = "";

                    arrayPrint[0] = configuration[0].col_2;
                    arrayPrint[1] = "PAGO";
                    arrayPrint[2] = configuration[0].col_11;
                    arrayPrint[3] = "\n";
                   

                    arrayPrintEnd[0] = configuration[0].col_6;
                    arrayPrintEnd[1] = objResp.length;
                    arrayPrintEnd[2] = numberTruncTwoDec(objResp.amountTotal);

                    print += arrayPrint;
                    print += objResp.print;
                    print += arrayPrintEnd;

                    let objFile = file.create({
                        name: configuration[0].col_7 + "_" + parameters.fechaCabecera + ".csv",
                        fileType: file.Type.CSV,
                        contents: print,
                        folder: configuration[0].col_8,
                    });

                    var fileId = objFile.save();
                    log.debug("fileId", fileId);
                }


                if (summary.inputSummary.error) {
                    var e = error.create({
                        name: "INPUT_STAGE_FAILED",
                        message: summary.inputSummary.error
                    });

                    body = "Ocurrio un error con la siguiente informacion : <br>" +
                        "Codigo de Error: " + e.name + "<br>" +
                        "Mensaje de Error: " + e.message;

                    email.send({
                        author: author,
                        recipients: recipients,
                        subject: subject,
                        body: body
                    });

                    respuesta.error = true;
                    respuesta.message = body;
                } else {

                    var errorMsg = [];
                    summary.mapSummary.errors.iterator().each(function (key, value) {
                        var msg = "MAP Error: " + key + ". Error was: " + JSON.parse(value).message + "<br>";
                        errorMsg.push(msg);
                        return true;
                    });

                    summary.reduceSummary.errors.iterator().each(function (key, value) {
                        var msg = "REDUCE Error: " + key + ". Error was: " + JSON.parse(value).message + "<br>";
                        errorMsg.push(msg);
                        return true;
                    });

                    if (errorMsg.length > 0) {
                        var e = error.create({
                            name: "ERROR_CUSTOM",
                            message: JSON.stringify(errorMsg)
                        });

                        body = "Ocurrio un error con la siguiente informacion : <br>" +
                            "Codigo de Error: " + e.name + "<br>" +
                            "Mensaje de Error: " + e.message;

                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: subject,
                            body: body
                        });

                        respuesta.error = true;
                        respuesta.message = body;
                    } else {
                        if (errorReduce) {
                            var errorString = JSON.stringify(arrayReduceErrors);
                            errorString = errorString.replace(/,/g, "\n").replace(/\[|\]|\"/g, "");

                            body = "Ocurrieron errores en el procesamiento: <br> "+
                                "<br> <br> Resumen de errores en la " + procesoSummarize + " : <br>" + errorString;

                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body
                            });

                            respuesta.error = true;
                            respuesta.message = body;
                        } else {

                            body = "El proceso " + proceso + " ha finalizado correctamente. Se adjunta el archivo generado."

                            var adjunto = null;

                            if (!utilities.isEmpty(fileId)) {
                                var fileObj = file.load({
                                    id: fileId
                                });
                                adjunto = [fileObj];

                            }

                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body,
                                attachments: adjunto
                            });

                            respuesta.message = body;
                        }
                    }
                }

            } catch (error) {
                log.error('Summarize catch error', error.message);
            }
        }

        const buildFilters = (parametros) => {
            let filtros = [];
            
            filtros.push({
                name: "internalid",
                operator: "ANYOF",
                values: JSON.parse(parametros.pagos)
            });
           
            return filtros;
        };

        const getConfiguration = (parameters) => {
            let filtros = [];
              
            filtros.push({
                name: "custrecord_l54_pago_panel_sub",
                operator: "IS",
                values: parameters.subsidiaria
            });

            filtros.push({
                name: "custrecord_l54_pago_panel_banco_file",
                operator: "IS",
                values: parameters.banco
            });

            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.operator, n.values, n.formula));
            
            const savedSearch = InitSearch.getResultSearch("customsearch_l54_pagos_file_panel_conf", filters);

            return savedSearch;
        }

        function numberTruncTwoDec(nStr) {
            x = nStr.toString().split('.');
            x1 = x[0];
            x2 = x.length > 1 ? '.' + x[1] : '.00';
            x2 = x2.length < 3 ? x2 + '0' : x2.substring(0, 3);
            return x1 + x2;
        }
        
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
