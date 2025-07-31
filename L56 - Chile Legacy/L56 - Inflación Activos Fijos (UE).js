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
                    journal = currentRecord.getValue({fieldId: "custrecord_l56_audit_inflation_journal"});
                    asset = currentRecord.getValue({fieldId: "custrecord_l56_audit_inflation_asset"});
                if (scriptContext.type == scriptContext.UserEventType.VIEW || scriptContext.type == scriptContext.UserEventType.EDIT) {
                    let customButton = form.addButton({
                        id: 'custpage_l56_button',
                        label: "Eliminar Historial",
                        functionName: "deleteRecords(" + journal + "," + asset + ")"
                    });
                }
                form.clientScriptModulePath = './L56 - Inflación Activo Fijo (CL).js';
    
            } catch (e) {
                log.error({
                    title: `${FN} error`,
                    details: { message: `${FN} - ${e.message || `Unexpected error`}` },
                });
                throw { message: `${FN} - ${e.message || `Unexpected error`}` };
            }
        };

        return {
            beforeLoad
        };
    });