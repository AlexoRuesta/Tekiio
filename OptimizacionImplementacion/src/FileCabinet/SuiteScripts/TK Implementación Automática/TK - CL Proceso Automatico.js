/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
*/
define(["N/url", "N/format", "N/currentRecord", "N/ui/dialog"], function (url, format, currentRecord, dialog) {

    const pageInit = (scriptContext) => {
        console.log("START CLIENT SCRIPT");
        currentRecord = currentRecord.get();
    }

    const fieldChanged = (scriptContext) => {
        let currentRecord = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;
        let line = scriptContext.line;

        let filters = ["custpage_type_script", "custpage_configuration"];
        console.log("filters.indexOf(fieldId)",filters.indexOf(fieldId));

        if (filters.indexOf(fieldId) >= 0) {
            let parameters = getFiltersValue(currentRecord);
            console.log("parameters", parameters)
            let suiteletURL = getSuiteletURL();
            suiteletURL = addParametersToUrl(suiteletURL, parameters);
            setWindowChanged(window, false);
            window.location.href = suiteletURL;
        }
        return true;
    }

    const saveRecord = (scriptContext) => {
        try {
            var viewType = scriptContext.currentRecord.getValue("suitelet"),
                information = scriptContext.currentRecord.getValue("custpage_sublistdata"),
                roles = scriptContext.currentRecord.getValue("custpage_roles")
                messague  = {
                    title: "Atencion",
                    message: "Este proceso puede tardar. Se le enviara un correo al finalizar.\n ¿Desea continuar?"
                };
            
            
            console.log("solicitud", viewType);
            console.log("getResultSublistData()", getResultSublistData(information));
            console.log("roles", roles);

            if(viewType != "Proceso RED"){
                if(!getResultSublistData(information, 1, "T")){
                    alert_msg("Se debe seleccionar almenos un valor en la lista.");
                    return false;
                }
            }
            
            if(viewType == "setRolesScripts"){
                if(roles[0] == ""){
                    alert_msg("Se debe seleccionar almenos un rol.");
                    return false;
                }
            }

            alert("Este proceso puede tardar. Se le enviara un correo al finalizar.")
            return true;
        } catch (e) {
            console.log("Error en saveRecord", e);
        }
    }

    const getResultSublistData = (sublistData, pos, value) => {
        let resultData = [];
        log.debug("entro a la funcion", sublistData)
        try {
            const breakLine = /\u0002/;
            const breakColumns = /\u0001/;

            let lines = sublistData.split(breakLine);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].split(breakColumns);
                log.debug("line", line);
                if (line[pos] == value) {
                    log.debug("line 2", line);
                    return true;
                }
            }
            return false;
        } catch (error) {
            log.error("An error was found in [getSublistData] function", error);
        }

        log.error("resultData", resultData);
        return resultData;
    }

    const alert_msg = (bodyMessage) => {
        dialog.alert({
            title: "Mensaje",
            message: bodyMessage
        }).then(function (result) {
            console.log("Success with value " + result);
        }).catch(function (reason) {
            console.log("Failure: " + reason);
        });
    }

    const importCsv = (parent) => {
        let parameters = getFiltersPageValue("importCsv", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    } 

    const resultImportCsv = (parent) => {
        let parameters = getFiltersPageValue("resultImportCsv", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    } 

    const setRolesScripts = (parent) => {
        let parameters = getFiltersPageValue("setRolesScripts", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    }

    const setRolesRecords = (parent) => {
        let parameters = getFiltersPageValue("setRolesRecords", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    }

    const setSubsidiariesRecords = (parent) => {
        let parameters = getFiltersPageValue("setSubsidiariesRecords", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    }

    const volver = (parent) => {
        let parameters = getFiltersPageValue("", parent);
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    }

    const setPurpura = () => {
        var urlSuitelet = url.resolveScript({
            scriptId : 'customscript_tk_process_automatic',
            deploymentId : 'customdeploy_tk_process_automatic',
            returnExternalUrl : false                                             
        });

        //window.location.href = urlSuitelet;
        window.open(urlSuitelet, '_blank');
    }

    const getSuiteletURL = () => {
        return url.resolveScript({
            scriptId: "customscript_tk_process_automatic",
            deploymentId: "customdeploy_tk_process_automatic",
            returnExternalUrl: false
        });
    }

    const getFiltersValue = (currentRecord) => {
        let values = {
            country: currentRecord.getValue("custpage_country"),
            typeScript: currentRecord.getValue("custpage_type_script"),
            suitelet: currentRecord.getValue("suitelet"),
            configuration: currentRecord.getValue("custpage_configuration"),
        };
        return values;
    }

    const getFiltersPageValue = (currentRecord, parent) => {
        let values = {
            suitelet: currentRecord,
            configuration: parent
        };
        return values;
    }

    const addParametersToUrl = (suiteletURL, parameters) => {
        for (let param in parameters) {
            if (parameters[param]) {
                suiteletURL = `${suiteletURL}&${param}=${parameters[param]}`;
            }
        }
        return suiteletURL;
    }

    return {
        pageInit,
        fieldChanged,
        saveRecord,
        importCsv,
        resultImportCsv,
        setRolesScripts,
        setRolesRecords,
        setSubsidiariesRecords,
        volver,
        setPurpura
    }
})