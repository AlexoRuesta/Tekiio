/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/error", "N/search", "N/task", "N/runtime"],
    function (record, error, search, task, runtime) {

        /**
         * Function definition to be triggered before record is save.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            var proceso = "afterSubmit";
            var nameProcess = "Asignar Restlets";

            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;
            var script = runtime.getCurrentScript();
            log.debug(proceso, "INICIO - function " + proceso);

            try {

                if (scriptContext.type == "create" || scriptContext.type == "edit") {
                    /** Scripts Parametros */
                    var param1 = script.getParameter("custscript1"),
                        param2 = script.getParameter("custscript2"),
                        param3 = script.getParameter("custscript3"),
                        param4 = script.getParameter("custscript4"),
                        param5 = script.getParameter("custscript5"),
                        param6 = script.getParameter("custscript6");
                
                    log.debug("restlet",param1)

                    var objRecord = record.load({ type: recType, id: recId });
                  
                    var solicitud       = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_solicitud" }),
                        actualizar      = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_actualizar" }),
                        solicitudLote   = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_solicitud_lote" }),
                        actualizarLote  = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_actualizar_lote" }),
                        envio           = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_email" }),
                        actLogs         = objRecord.getValue({ fieldId: "custrecord_3k_url_rest_log" });

                    
                    if(solicitud == ""){
                        let url = getURL(param1)
                        objRecord.setValue("custrecord_3k_url_rest_solicitud", url);
                    }

                    if(actualizar == ""){
                        let url = getURL(param2)
                        objRecord.setValue("custrecord_3k_url_rest_actualizar", url);
                    }


                    if(solicitudLote == ""){
                        let url = getURL(param3)
                        objRecord.setValue("custrecord_3k_url_rest_solicitud_lote", url);
                    }


                    if(actualizarLote == ""){
                        let url = getURL(param4)
                        objRecord.setValue("custrecord_3k_url_rest_actualizar_lote", url);
                    }


                    if(envio == ""){
                        let url = getURL(param5)
                        objRecord.setValue("custrecord_3k_url_rest_email", url);
                    }

                    if(actLogs == ""){
                        let url = getURL(param6)
                        objRecord.setValue("custrecord_3k_url_rest_log", url);
                    }

                    objRecord.save();
                }
            } catch (error) {
                var mensajeError = "Error NetSuite Excepción - Error en la función : " + proceso + " - Detalles: " + error.message;
                log.error(proceso, mensajeError);
                // createError(name, mensajeError, true);
            }

            log.debug(proceso, "FIN - function " + proceso);
            return true;
        }

        function getURL(script) {
            var url = "";
            let customSearch = search.load({ id: "customsearch_tk_search_deployments" });
            
            let filterOne = search.createFilter({ join: "script", name: "internalid", operator: search.Operator.ANYOF, values: script });
            customSearch.filters.push(filterOne);
            
            var pagedData = customSearch.runPaged({ pageSize: 1000 });

            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index
                });
                page.data.forEach(function (result) {
                    let deploy = result.getValue(result.columns[1]);
                    log.debug("deploy",deploy)
                    var custLoad = record.load({
                        type: record.Type.SCRIPT_DEPLOYMENT,
                        id: deploy
                    });
                    log.debug("custLoad",custLoad)
                    
                    log.debug("custLoad",custLoad.getValue("url"))
                    
                    url = custLoad.getValue("url");
                });
            });

            return url;
        }

    return {
        afterSubmit: afterSubmit
    };
});