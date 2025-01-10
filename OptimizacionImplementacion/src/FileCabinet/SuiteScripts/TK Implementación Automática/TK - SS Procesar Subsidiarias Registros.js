/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/runtime", "N/file", "N/search", "N/record", "./TK - LIB Email.js", "./TK - LIB Proceso Automatico.js"], (runtime, file, search, record, library, libAuditoria) => {

    const execute = (context) => {

        const nameProcess = "Asignar Subsidiarias en Registros";
        // col1 -> Record Name, col2 -> Record ID, col3 -> Record Netsuite ID, col4 -> Field
               
        var FN = "Procesar Subsidiarias en Registros",
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            { Auditoria } = libAuditoria,
            sendemail = new sendEmail();
            sendemail.init();

            audit = new Auditoria();
            audit.init();

        // col1 -> Script Name, col2 -> Script ID, col3 -> Script Type, col4 -> internalID
        try {
            let fileID = runtime.getCurrentScript().getParameter({ name: "custscript_tk_ss_process_subs_regs_input" }),
                jsonTransaction = file.load({id: fileID}).getContents(),
                arrayData = JSON.parse(jsonTransaction),
                arrayInput = arrayData.infoRecords,
                subsidiaries = (arrayData.subs).split(","),
                parent = arrayData.parent,
                arrAux  = [],
                rptJson = [],
                body    = "";

            var date = audit.getDate();

            for (let i = 0; i < arrayInput.length; i++) {
                let element = arrayInput[i];
                var statusRegister = setSubsidiaries(element, subsidiaries);
                if(statusRegister != ""){
                    body += statusRegister;
                    audit.setAudit(date, nameProcess, body, "ERROR", parent, null, subsidiaries);
                }else{
                    audit.setAudit(date, nameProcess, "Se asignaron correctamente las subsidiarias al record " + element.col1 + ".", "COMPLETO", parent, null, subsidiaries);
                }
            }

            if(body != ""){
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
            }else{
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, true));
            } 
            log.debug("Finalizo el proceso" + FN);
     
        } catch (error) {
            log.error("error", error)
        }
        
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

    return {
        execute: execute,
    };
});
