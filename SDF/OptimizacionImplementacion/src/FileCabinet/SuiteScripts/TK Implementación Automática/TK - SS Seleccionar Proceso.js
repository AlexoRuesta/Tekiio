/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/format", "N/file", "N/search", "N/record", "./TK - LIB Email.js", "./TK - LIB Proceso Automatico.js"], (task, runtime, format, file, search, record, library, libAuditoria) => {

    const execute = (context) => {
        const nameProcess = "Implementación Automática";
        
        var FN = "RED",
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            { Auditoria } = libAuditoria,
            sendemail = new sendEmail();
            sendemail.init();

            audit = new Auditoria();
            audit.init();
        try {
            let jsonTransaction = runtime.getCurrentScript().getParameter({ name: "custscript_tk_ss_select_process_input" }),
                arrayData = JSON.parse(jsonTransaction),
                parent = arrayData.parent,
                proceso = arrayData.proceso,
                statusGeneral = true;
                body    = "";

            if(proceso != "BLUE"){
                while (statusGeneral) {
                    var objEntity = record.load({
                        type:"customrecord_tk_configuration_general",
                        id: parent
                    });
    
                    statusGeneral = objEntity.getValue("custrecord_tk_configuration_general_stat");  
                    log.debug("statusGeneral",statusGeneral)
                }
            }
            

            var configuration = getValuesConfiguration(parent);
            log.debug("jsonTransaction", jsonTransaction)
            log.debug("configuration", configuration)

            var arrImports = getImports(parent),
                arrRecords = getRecords(parent),
                arrScripts = getScripts(parent),
                arrSubsRec = getSubsRec(parent);

            let jsonResult = {
                infoRecords: "",
                roles: configuration.Roles,
                subs: configuration.Subsidiaries,
                nivel: 4,
                parent: parent,
            }

            var folderID = getFolder();
           
            jsonResult.infoRecords = arrSubsRec;
            let a = getFile(jsonResult, folderID)
            var status = submitMapReduceTask(a,"customscript_tk_ss_process_subs_regs", "customdeploy_tk_ss_process_subs_regs");
            
            if (checkStatus(status)) {
                jsonResult.infoRecords = arrRecords;
                let a = getFile(jsonResult, folderID)
                status = submitMapReduceTask(a,"customscript_tk_ss_process_records", "customdeploy_tk_ss_process_records"); 
            }else{
                body += "Ocurrio un error al ejecutar Procesar Subsidiarias en Registros";
            }

            if (checkStatus(status)) {
                jsonResult.infoRecords = arrScripts;
                let a = getFile(jsonResult, folderID)
                status = submitMapReduceTask(a,"customscript_tk_ss_process_scripts", "customdeploy_tk_ss_process_scripts");
            }else{
                body += "Ocurrio un error al ejecutar Asignar Roles en Records";
            }
            
            if (checkStatus(status)) {
                jsonResult.infoRecords = arrImports;
                let a = getFile(jsonResult, folderID)
                status = submitMapReduceTask(a,"customscript_tk_ss_process_automatic", "customdeploy_tk_ss_process_automatic");
            }else{
                body += "Ocurrio un error al ejecutar Procesar Scripts";
            }

            if(checkStatus(status)){
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, true));
            }else{
                body += "Ocurrio un error al ejecutar Procesar Cust Imports";
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
            }

            
            var objEntity = record.load({
                type:"customrecord_tk_configuration_general",
                id: parent
            });

            objEntity.setValue("custrecord_tk_configuration_general_stat", false);
            objEntity.save(); 
            

            log.debug("Finalizo " + FN)
        } catch (error) {
            log.error("Error en SS " + FN, error);
            sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyCatch(nameProcess, error));
        }
        
    }

    const getValuesConfiguration = (configuration) => {
           
        var arrayRol = "", arraySub = "";
        var fieldLookUp = search.lookupFields({
            type: "customrecord_tk_configuration_general",
            id: configuration,
            columns: ["custrecord_tk_configuration_general_sub", "custrecord_tk_configuration_general_rol"]
        });

        log.debug( " fieldLookUp ",fieldLookUp)
        let arrSub = fieldLookUp.custrecord_tk_configuration_general_sub,
            arrRol = fieldLookUp.custrecord_tk_configuration_general_rol;

        if(arrRol.length != 0){
            arrRol.forEach(element => {
                arrayRol += element.value + ",";
            });
            let b = arrayRol.length;
            log.debug(" arrRol",  arrayRol)
            arrayRol = arrayRol.substring(0, b-1)
        }

        if(arrSub.length != 0){
            arrSub.forEach(element => {
                arraySub+= element.value + ",";
            });
            let b = arraySub.length;
            arraySub = arraySub.substring(0, b-1)
        }

        return {
            Subsidiaries: arraySub,
            Roles: arrayRol
        };
    }


    const getFolder = () => {
        let searchCustom = search.create({
            type: "folder",
            columns: ["internalid"],
            filters: ["name", "is", "FolderAutomatico"]
        });

        objResult = searchCustom.run().getRange(0, 50);
        if (objResult == "" || objResult == null) {
            let newFolder = record.create({
                type: "folder"
            });

            newFolder.setValue("name", "FolderAutomatico");
            var foldeID = newFolder.save();
        } else {
            var foldeID = objResult[0].getValue("internalid");
        }

        return foldeID;
    }
    
    const getFile = (rptJson, folderID) => {
        let searchCustomFile = search.create({
            type: "file",
            columns: ["internalid"],
            filters: ["name", "is", "automaticInformation.txt"]
        });

        objResult = searchCustomFile.run().getRange(0, 50);

        if (objResult == "" || objResult == null) {
            // Colocar mensaje de alerta
        } else {
            var fileID = objResult[0].getValue("internalid");
            log.debug("Encontrado fileID", fileID);

            file.delete({
                id: fileID
            });
        }

        fileObj = file.create({
            name: "automaticInformation.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(rptJson),
            folder: folderID
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);

        return txt;
    }
   
    const checkStatus = (taskID) => {
        var myTaskStatus = task.checkStatus({
            taskId: taskID
        });

        let statusGeneral = myTaskStatus.status;

        while (statusGeneral == task.TaskStatus.PROCESSING || statusGeneral == task.TaskStatus.PENDING) {
            myTaskStatus = task.checkStatus({
                taskId: taskID
            });
            statusGeneral = myTaskStatus.status;
        }

        log.debug("statusGeneral",statusGeneral)

        if(statusGeneral == task.TaskStatus.COMPLETE) return true
        else   return false
    }

    const setSubsidiaries = (element, paramSub) => {
        var body = "";
        let customSearch = search.create({
            type: element.col3,
            filters: [
                ["isinactive", "is", "F"]
            ],
            columns: [
                search.createColumn({name: "internalid", label: "Internal ID"})
            ]
        });
        
        var pagedData = customSearch.runPaged({ pageSize: 1000 });
        pagedData.pageRanges.forEach(function (pageRange) {
            page = pagedData.fetch({
                index: pageRange.index
            });
            page.data.forEach(function (result) {
                try {
                    let register = result.getValue("internalid");

                    let obj = record.load({ type: element.col3, id: register, isDynamic: true });
                    obj.setValue(element.col4, paramSub);
                    obj.save();
                } catch (error) {
                    body +=  "<p>La actualización del campo subsidiaria del record " + element.col1 + "  para el registro " + register + " fallo.</p>";
                }
            });
        });

        return body; 
    }

    const submitMapReduceTask = (paramRecords, script, deploy, status) => {
        let params = {
            custscript_tk_ss_process_automatic_input: paramRecords,
            custscript_tk_ss_process_scripts_input: paramRecords,
            custscript_tk_ss_process_records_input: paramRecords,
            custscript_tk_ss_process_subs_regs_input: paramRecords
        }

        /*if(status == 1) params.custscript_tk_ss_process_automatic_input = JSON.stringify(paramRecords);
        else if(status == 2) params.custscript_tk_ss_process_records_input = JSON.stringify(paramRecords);
        else if(status == 3) params.custscript_tk_ss_process_scripts_input = JSON.stringify(paramRecords);
 */
        log.debug("params", JSON.stringify(params));

        let scriptTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: script,
            deploymentId: deploy,
            params
        });
        let scriptTaskId = scriptTask.submit();
        return scriptTaskId;
    }

    const getScripts = (params) => {
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
            log.debug("getScripts", params)
            customSearch.filters.push(
                search.createFilter({
                    name: "custrecord_tk_configuration_script_paren",
                    operator: search.Operator.IS,
                    values: params,
                })
            );
        }
            
        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("getScripts.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    col1  : resultSearch[i].getText({ name: "custrecord_tk_configuration_script_list" }) || "",
                    col2  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_script_list" }) || ""
                })
            }
        }

        log.debug("getScripts", result)
        return result;
    }

    const getRecords = (params) => {
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
        log.debug("getRecords.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    col1  : resultSearch[i].getText({ name: "custrecord_tk_configuration_rec_records" }) || "",
                    col2  : "T" || "",
                    col3  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_rec_records" }) || ""
                })
            }
        }

        log.debug("getRecords", result)
        return result;
    }

    const getSubsRec = (params) => {
        var result   = [];

        var customSearch = search.create({
            type: "customrecord_tk_configuration_sub_rec",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_sr_record", label: "Name"}), 
               search.createColumn({join:"custrecord_tk_configuration_sr_record", name:"scriptid"}), 
               search.createColumn({name: "custrecord_tk_configuration_sr_field", label: "Field"})
      
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
        log.debug("getSubsRec.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    col1  : resultSearch[i].getText({ name: "custrecord_tk_configuration_sr_record" }) || "",
                    col2  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_sr_record" })  || "",
                    col3  : resultSearch[i].getValue({join:"custrecord_tk_configuration_sr_record", name:"scriptid"}) || "",
                    col4  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_sr_field" }) || ""
                })
            }
        }

        log.debug("getSubsRec", result)
        return result;
    }

    const getImports = (params) => {
        var result   = [];


        var customSearch = search.create({
            type: "customrecord_tk_configuration_imports",
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_import_rec", label: "Name"}),
               search.createColumn({name: "custrecord_tk_configuration_import_csv", label: "Archivo CSV"}),
               search.createColumn({name: "custrecord_tk_configuration_import_nivel", label: "Nivel"}),
               search.createColumn({name: "custrecord_tk_configuration_import_cust", label: "Importacion"}),
      
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
        log.debug("getImports.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    col1  : resultSearch[i].getText({ name: "custrecord_tk_configuration_import_rec" }) || "",
                    col2  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_import_rec" }) || "",
                    col3  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_import_csv" }) || "",
                    col4  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_import_nivel" }) || "",
                    col5  : resultSearch[i].getValue({ name: "custrecord_tk_configuration_import_cust" }) || "",
                    col6  : resultSearch[i].getValue({ name: "internalid" }) || ""
                })
            }
        }

        log.debug("getImports", result)
        return result;
    }

    return {
        execute: execute,
    };
});

