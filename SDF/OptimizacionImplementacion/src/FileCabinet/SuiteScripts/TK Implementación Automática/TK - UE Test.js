/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/L598 - configuration.json
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
            var nameProcess = "Completar Informacion";

            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;
            var script = runtime.getCurrentScript();
            log.debug(proceso, "INICIO - function " + proceso);

            try {

                if (scriptContext.type == "create" || scriptContext.type == "edit") {
                    var objRecord = record.load({ type: recType, id: recId });
                  
                    var campo = objRecord.getValue({ fieldId: "custrecord_camp_1" })
                
                    log.debug("campo",campo)

                }
            } catch (error) {
                var mensajeError = "Error NetSuite Excepción - Error en la función : " + proceso + " al setear Rubros de IVA - Detalles: " + error.message;
                log.error(proceso, mensajeError);
                // createError(name, mensajeError, true);
            }

            log.debug(proceso, "FIN - function " + proceso);
            return true;
        }

        function createError(nameError, mensajeError, notify) {

            throw (error.create({
                name: nameError,
                message: mensajeError,
                notifyOff: notify
            })
            );

        }

        return {
            afterSubmit: afterSubmit
        };
    });


    /**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/format", "N/file", "N/search", "N/record", "./TK - LIB Email.js"], (task, runtime, format, file, search, record, library) => {

    const execute = (context) => {
        const nameProcess = "Modificar Roles";
        // col1 -> Script Name, col2 -> Script ID, col3 -> Script Type, col4 -> internalID
        try {
            var objRecord = record.load({
            type: "role", 
            id: 1000
        });
        
        log.debug(objRecord)    
            

        fileObj = file.create({
            name: "lol3.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(objRecord),
            folder: 14
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);
        } catch (error) {
            log.error("error", error)
        }
        
    }


    return {
        execute: execute,
    };
});



/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/format", "N/file", "N/search", "N/record"], (task, runtime, format, file, search, record) => {

    const execute = (context) => {
        const nameProcess = "Modificar Roles";
        // col1 -> Script Name, col2 -> Script ID, col3 -> Script Type, col4 -> internalID
        /*try {
            var objRecord = record.load({
            type: "role", 
            id: 1000
        });*/
        try{
        var objRecord = record.load({
            type: "customrecordtype", 
            id: 612
        });
        
        log.debug(objRecord)    
            

        fileObj = file.create({
            name: "lol5.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(objRecord),
            folder: 14
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);



        } catch (error) {
            log.error("error", error)
        }
        
    }


    return {
        execute: execute,
    };
});

