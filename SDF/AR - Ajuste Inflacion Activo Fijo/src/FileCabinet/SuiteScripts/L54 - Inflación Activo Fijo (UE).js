/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/runtime"],
    function (runtime) {

        const beforeLoad = (scriptContext) => {
            const FN = 'beforeLoad';
            try {
                let form = scriptContext.form,
                    currentRecord = scriptContext.newRecord,
                    journal = currentRecord.getValue({fieldId: "custrecord_l54_audit_inflation_journal"});
                    asset = currentRecord.getValue({fieldId: "custrecord_l54_audit_inflation_asset"});
                if (scriptContext.type == scriptContext.UserEventType.VIEW || scriptContext.type == scriptContext.UserEventType.EDIT) {
                    let customButton = form.addButton({
                        id: 'custpage_l54_button',
                        label: "Eliminar Historial",
                        functionName: "deleteRecords(" + journal + "," + asset + ")"
                    });
                }
                form.clientScriptModulePath = './L54 - Inflación Activo Fijo (CL).js';
    
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
            afterSubmit
        };
    });