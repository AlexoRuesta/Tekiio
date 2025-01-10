/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/search", "N/record", "./TK - LIB Email.js"], (task, runtime, search, record, library) => {

    const execute = (context) => {
        const nameProcess = "Eliminar Informacion";
        try {
            log.debug("Inicio " + nameProcess)
            var currScript  = runtime.getCurrentScript(),
                array       = [],
                parent      = currScript.getParameter("custscript_tk_ss_delete_information_par"),
                deployID    = currScript.getParameter("custscript_tk_ss_delete_information_id");;

            log.debug("Parent", parent);
            log.debug("deployID", deployID);

            var arrScripts = getScriptsDelete(parent);
            var arrRecords = getRecordsDelete(parent);
            var arrSubsRec = getSubsRecDelete(parent);
            var arrAuditor = getAuditorDelete(parent);

            array = array.concat(arrScripts); 
            array = array.concat(arrRecords); 
            array = array.concat(arrSubsRec); 
            array = array.concat(arrAuditor); 

            array.forEach(element => {
                record.delete({
                    type: element.recID,
                    id: element.internalid,
                });
            });

            var arrImports = getImportDelete(parent);

            arrImports.forEach(element => {
                var obj = record.load({
                    type: element.recID,
                    id: element.internalid,
                });

                obj.setValue("custrecord_tk_configuration_import_paren", "");
                obj.save();
            });

            log.debug("context", context)
            
            var objRecord = record.load({
                type: record.Type.SCRIPT_DEPLOYMENT, 
                id: deployID
            });


            objRecord.setValue({ fieldId: "custscript_tk_ss_delete_information_par", value: "" });

            objRecord.save();


            return true;

        } catch (error) {
            log.error("error " + nameProcess, error)
        }
        
    }

    const getImportDelete = (params) => {
        var result   = [];


        var customSearch = search.create({
            type: "customrecord_tk_configuration_imports",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_import_rec", label: "Name"})
      
            ]
         });

        if (params) {
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_configuration_import_paren",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }

        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    recID: "customrecord_tk_configuration_imports",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_import_rec" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getImportDelete", result)
        return result;
    }

    const getAuditorDelete = (params) => {
        var result   = [];

        var customSearch = search.create({
            type: "customrecord_tk_auditoria",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_auditoria_process", label: "Name"})
      
            ]
         });

        if (params) {
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_auditoria_parent",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }
            
        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    recID: "customrecord_tk_auditoria",
                    name: resultSearch[i].getText({ name: "custrecord_tk_auditoria_process" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getAuditorDelete", result)
        return result;
    }

    const getScriptsDelete = (params) => {
        var result   = [];

        var customSearch = search.create({
            type: "customrecord_tk_configuration_scripts",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_script_list", label: "Name"})
      
            ]
         });

        if (params) {
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_configuration_script_paren",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }
            
        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    recID: "customrecord_tk_configuration_scripts",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_script_list" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getScriptsDelete", result)
        return result;
    }

    const getRecordsDelete = (params) => {
        var result   = [];

        var customSearch = search.create({
            type: "customrecord_tk_configuration_records",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_rec_records", label: "Name"})
            ]
        });

        if (params) {
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_configuration_rec_parent",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }

        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    recID: "customrecord_tk_configuration_records",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_rec_records" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getRecordsDelete", result)
        return result;
    }

    const getSubsRecDelete = (params) => {
        var result   = [];

        var customSearch = search.create({
            type: "customrecord_tk_configuration_sub_rec",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_sr_record", label: "Name"})
      
            ]
         });

         if (params) {
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_configuration_sr_parent",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }
        
        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    recID: "customrecord_tk_configuration_sub_rec",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_sr_record" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getSubsRecDelete", result)
        return result;
    }

    return {
        execute: execute,
    };
});
