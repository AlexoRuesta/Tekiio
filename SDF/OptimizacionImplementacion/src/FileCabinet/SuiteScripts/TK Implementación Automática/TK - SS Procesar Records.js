/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/runtime", "N/file", "N/record", "./TK - LIB Email.js", "./TK - LIB Proceso Automatico.js"], (runtime, file, record, library, libAuditoria) => {

    const execute = (context) => {
        const nameProcess = "Asignar Roles en Records"
        // col1 -> Record Name, col2 -> Mantener Permisos, col3 -> Record ID, col4 -> internalid
        var FN = "Procesar Records",
            breakLine = /\u0005/;
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            { Auditoria } = libAuditoria,
            sendemail = new sendEmail();
            sendemail.init();
            
            audit = new Auditoria();
            audit.init();
        try {
            
            let fileID = runtime.getCurrentScript().getParameter({ name: "custscript_tk_ss_process_records_input" }),
                jsonTransaction = file.load({id: fileID}).getContents(),    
                arrayData = JSON.parse(jsonTransaction),
                arrayInput = arrayData.infoRecords,
                roles = arrayData.roles,
                nivel = arrayData.nivel,
                parent = arrayData.parent,
                rptJson = [],
                body    = "";
            
            log.debug("información Input", arrayInput);
            log.debug("Other", roles + " ->> " + nivel);

            var arrRoles =  roles.split(",");
            log.debug("arrRoles", arrRoles);
            
            var date = audit.getDate();

            for (let i = 0; i < arrayInput.length; i++) {
                let element = arrayInput[i],
                    arrAux  = [],
                    line = 0;
                try {
                    var objRecord = record.load({
                        type: "customrecordtype", 
                        id: element.col3
                    });
                    
                    var numLines = objRecord.getLineCount({sublistId: "permissions"});
                    if (element.col2 == "T") {
                        for (var j = 0; j < numLines; j++) {
                            var permissionsRole = objRecord.getSublistValue({
                                sublistId: "permissions",
                                fieldId: "permittedrole",
                                line: j
                            });
    
                            if(arrRoles.indexOf(permissionsRole) != -1){
                                objRecord.setSublistValue({sublistId: "permissions", fieldId: "permittedlevel", line: j, value: nivel});
                                arrAux.push(permissionsRole);
                            }
                        }
    
                        arrRoles.forEach(index => {
                            if(arrAux.indexOf(index) == -1){
                                objRecord.setSublistValue({sublistId: "permissions", fieldId: "permittedlevel", line: numLines, value: nivel});
                                objRecord.setSublistValue({sublistId: "permissions", fieldId: "permittedrole", line: numLines, value: index});
                                numLines ++;
                            }
    
                        });
                    }else{
                        for (var j = objRecord.getLineCount({ sublistId: "permissions" }) - 1; j >= 0; j--) {
                            objRecord.removeLine({
                                sublistId: "permissions",
                                line: j,
                            });
                        }
    
                        arrRoles.forEach(index => {
                            objRecord.setSublistValue({sublistId: "permissions", fieldId: "permittedlevel", line: line, value: nivel});
                            objRecord.setSublistValue({sublistId: "permissions", fieldId: "permittedrole", line: line, value: index});
                            line ++;
                        });
                    }
                    objRecord.setValue("accesstype", "USEPERMISSIONLIST")
                    objRecord.save();
                    audit.setAudit(date, nameProcess, "Se asignaron correctamente los roles al record " + element.col1 , "COMPLETO", parent, arrRoles);
                } catch (error) {
                    let aux = "Ocurrio un error al asignar roles en el record  " + element.col1;
                    body +=  "<p>" + aux + ".</p>";
                    audit.setAudit(date, nameProcess, aux, "ERROR", parent, arrRoles)
                }
            }

            if(body != ""){
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
            }else{
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, true));
            } 

            log.debug("Finalizo el proceso " + FN)
        } catch (error) {
            log.error("Error en SS " + FN, error);
            sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyCatch(nameProcess, error));
        }
        
        /*var objRecord = record.load({
            type: "customrecordtype", 
            id: 612
        });
        
        log.debug(objRecord)    
            

        fileObj = file.create({
            name: "lol2.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(objRecord),
            folder: 14
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);*/

    }
    return {
        execute: execute,
    };
});

