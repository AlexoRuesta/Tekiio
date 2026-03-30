/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *@NAmdConfig /SuiteScripts/L56 - configuration.json
 * @NModuleScope Public
 */
define(["N/record", "N/search", "N/task", "N/runtime","N/record", "N/redirect", "N/file","L56/utilidades"],
    function (record, search, task, runtime,record,redirect,file,utilities) {

        const beforeLoad = (scriptContext) => {
            const FN = 'beforeLoad';
            try {

    
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
      
                if (scriptContext.type == scriptContext.UserEventType.DELETE) {
                    currentRecord = scriptContext.newRecord,
                    idLog = currentRecord.getValue({fieldId: "id"});
                    journal = currentRecord.getValue({fieldId: "custrecord_l56_log_ajusinf_jour"});
                    fileIdCuenta = currentRecord.getValue({fieldId: "custrecord_l56_log_ajusinf_report"});
                    if(!utilities.isEmpty(journal)){
                        record.delete({
                            type: "journalentry",
                            id: journal
                        });
                    }
                    if(!utilities.isEmpty(fileIdCuenta)){
                        file.delete({
                            id: fileIdCuenta
                        });
                    }
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
            //afterSubmit
        };
    });