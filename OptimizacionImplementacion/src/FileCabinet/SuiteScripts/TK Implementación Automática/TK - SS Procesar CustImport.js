/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/file", "./TK - LIB Email.js", "N/url", "./TK - LIB Proceso Automatico.js"], (task, runtime, file, library, url, libAuditoria) => {

    const execute = (context) => {
        const nameProcess= "Importación CSV";
        // col1 -> Record Name, col2 -> Record ID, col3 -> CSV ID, col4 -> Nivel, col5 -> custimport, col6 -> internalID 

        var FN = "Procesar Cust Imports",
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            { Auditoria } = libAuditoria,
            sendemail = new sendEmail();
            sendemail.init();

            
            audit = new Auditoria();
            audit.init();

        try {
            let fileID = runtime.getCurrentScript().getParameter({ name: "custscript_tk_ss_process_automatic_input" }),
                jsonTransaction = file.load({id: fileID}).getContents(),    
                arrayData = JSON.parse(jsonTransaction),
                arrayInput = arrayData.infoRecords,
                parent = arrayData.parent,
                rptJson = [];

            log.debug("información Input", arrayInput);
            log.debug("author", author);

            for (let l = 0; l < arrayInput.length; l++) {
                let objInfo = {},
                    objArr  = arrayInput[l];
                    
                let scriptTask = task.create({
                    taskType: task.TaskType.CSV_IMPORT,
                    mappingId: objArr.col5,
                    importFile : file.load(objArr.col3),
                    name: "Importacion Automatica " + objArr.col1
                });

                let csvImportTaskId = scriptTask.submit();
                
                var myTaskStatus = task.checkStatus({
                    taskId: csvImportTaskId
                });
                
                let statusGeneral = myTaskStatus.status;
                log.audit(FN, "Estado de carga: " + statusGeneral);

                while (statusGeneral == task.TaskStatus.PROCESSING || statusGeneral == task.TaskStatus.PENDING) {
                    myTaskStatus = task.checkStatus({
                        taskId: csvImportTaskId
                    });
                    statusGeneral = myTaskStatus.status;
                }

                objInfo.status = statusGeneral;
                objInfo.recordID = objArr.col2;
                objInfo.recordName = objArr.col1;

                rptJson.push(objInfo);
            }

            log.debug(FN, "response: " + JSON.stringify(rptJson));

            /*
            let searchCustom = search.create({
                type: "folder",
                columns: ["internalid"],
                filters: ["name", "is", "FolderCustImport"]
            });

            objResult = searchCustom.run().getRange(0, 50);
            if (objResult == "" || objResult == null) {
                let newFolder = record.create({
                    type: "folder"
                });

                newFolder.setValue("name", "FolderCustImport");
                var foldeID = newFolder.save();
            } else {
                var foldeID = objResult[0].getValue("internalid");
            }

            let searchCustomFile = search.create({
                type: "file",
                columns: ["internalid"],
                filters: ["name", "is", "informaccionImports.txt"]
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
                name: "informaccionImports.txt",
                fileType: file.Type.PLAINTEXT,
                contents: JSON.stringify(rptJson),
                folder: foldeID
            });

            // Save the file
            let txt = fileObj.save();
            log.debug("ID TXT", txt);*/

            var body = "";
            
            let link = "/app/setup/upload/csv/csvstatus.nl?whence=",
                host = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });

            log.debug("host", host)

            var date = audit.getDate();
            for (let l = 0; l < rptJson.length; l++) {
                let element = rptJson[l];

                if (element.status != "COMPLETE") {
                    let aux = "La importación del record " + element.recordName + " fallo."
                    body +=  "<p>" + aux + "</p>";
                    audit.setAudit(date, nameProcess, aux, "ERROR", parent);
                }else if(element.status == "COMPLETE"){
                    let aux = "La importación del record " + element.recordName + " finalizo."
                    audit.setAudit(date, nameProcess, aux, "COMPLETO", parent);
                }
            }

            if(body != ""){
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, host + link, false, body));
            }else{
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, host + link, true));
            } 

            log.debug("Finalizo el proceso " + FN)
        } catch (error) {
            log.error("Error en SS " + FN, error);
            sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyCatch(nameProcess, error));
        }
    }

    return {
        execute: execute,
    };
});

