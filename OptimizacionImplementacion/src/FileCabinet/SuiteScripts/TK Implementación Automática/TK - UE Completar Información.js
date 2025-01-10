/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/search", "N/task", "N/runtime"],
    function (record, search, task, runtime) {

        const beforeLoad = (scriptContext) => {
            const FN = 'beforeLoad';
            try {
                let form = scriptContext.form,
                    currentRecord = scriptContext.newRecord,
                    status = currentRecord.getValue({fieldId: "custrecord_tk_configuration_general_stat"});
                if (scriptContext.type == scriptContext.UserEventType.VIEW && status == false) {
                    let customButton = form.addButton({
                        id: 'custpage_tk_button',
                        label: "Auto Implementar",
                        functionName: "setConfiguration(" + currentRecord.id + ")"
                    });
                }
                form.clientScriptModulePath = './TK - CL Completar Información.js';
    
            } catch (e) {
                log.error({
                    title: `${FN} error`,
                    details: { message: `${FN} - ${e.message || `Unexpected error`}` },
                });
                throw { message: `${FN} - ${e.message || `Unexpected error`}` };
            }
        };

        const beforeSubmit = (scriptContext) => {
  
            const FN = "beforeSubmit";
            try {
      
              let objRecord = scriptContext.newRecord;
              const recType = objRecord.type;
              const currentScript = runtime.getCurrentScript();
      
              if (scriptContext.type == scriptContext.UserEventType.EDIT && objRecord.getValue({ fieldId: "custrecord_tk_configuration_general_chec"}) == true) {
                objRecord.setValue("custrecord_tk_configuration_general_stat", true)
              }
            }catch(e){
                log.error("Error en " + FN, e);
            }
        }

        /**
         * Function definition to be triggered before record is save.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            const FN = "afterSubmit";
            var nameProcess = "Completar Informacion";

            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;
            var script = runtime.getCurrentScript();
            log.debug(FN, "INICIO - function " + FN);

            try {
                var objRecord = record.load({ type: recType, id: recId });

                if (scriptContext.type == "create" || (scriptContext.type == "edit" && objRecord.getValue({ fieldId: "custrecord_tk_configuration_general_chec" }) == true)) {
                    
                  
                    var customSearch = search.create({
                        type: "customrecord_tk_additional_information",
                        filters:
                        [
                           ["custrecord_tk_additional_information_cou","anyof",objRecord.getValue({ fieldId: "custrecord_tk_configuration_general_cou" })]
                        ],
                        columns:
                        [
                           search.createColumn({name: "custrecord_tk_additional_information_jso", label: "JSON"})
                        ]
                     });

                    let resultCount = customSearch.runPaged().count;

                    if (resultCount != 0) {
                        let result = customSearch.run().getRange({ start: 0, end: 1 });
                        var json = result[0].getValue(customSearch.columns[0]);

                    } else {
                        log.error("No cuenta con un registro en el record TK - Información Adicional con el mismo país");
                        return false;
                    }
                 
                    var taskMap = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_tk_mp_information",
                        //deploymentId: "customdeploy_l54_carga_padron_map",
                        params: {
                            "custscript_tk_mp_information_input": json,
                            "custscript_tk_mp_information_country": objRecord.getValue({ fieldId: "custrecord_tk_configuration_general_cou" }),
                            "custscript_tk_mp_information_check": objRecord.getValue({ fieldId: "custrecord_tk_configuration_general_chec" }),
                            "custscript_tk_mp_information_parent": recId
                        }
                    });

                    var taskId = taskMap.submit();
                    //objRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
                }

            } catch (error) {
                var mensajeError = "Error NetSuite Excepción - Error en la función : " + FN + " - Detalles: " + error.message;
                log.error(FN, mensajeError);
                // createError(name, mensajeError, true);
            }

            log.debug(FN, "FIN - function " + FN);
            return true;
        }

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        };
    });