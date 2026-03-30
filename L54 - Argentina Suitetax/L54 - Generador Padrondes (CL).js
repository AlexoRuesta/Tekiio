/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/url'], function(url) {

    /**
     * Función que se ejecuta cuando la página carga
     */
    function pageInit(context) {
        console.log('Script del cliente inicializado');
    }

    function saveRecord(context) {
        var confirmacion = confirm('Este proceso puede tardar unos minutos. ¿Desea continuar?');
        
        if (!confirmacion) {
            return false;
        }
        
        return true;
    }

    const fieldChanged = (scriptContext) => {
        let currentRecord = scriptContext.currentRecord;
        let fieldId = scriptContext.fieldId;

        let filters = ["custpage_tipo_padron"];
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

    const volver = () => {
        let parameters = {
            suitelet: ""
        };
        console.log("parameters", parameters)
        let suiteletURL = getSuiteletURL();
        suiteletURL = addParametersToUrl(suiteletURL, parameters);
        setWindowChanged(window, false);
        window.location.href = suiteletURL;
    }

    const getFiltersValue = (currentRecord) => {
        let label = "";
        const tipoPadron = currentRecord.getValue("custpage_tipo_padron");

        if (tipoPadron == 1){
            label = "RG2681";
        } else if (tipoPadron == 2){
            label = "RG830";
        } else if (tipoPadron == 5){
            label = "SIRCIP";
        } else if (tipoPadron == 6){
            label = "EMBARGOS";
        }

        let values = {
            suitelet: label
        };

        // Solo agregar periodo cuando tipoPadron = 6
        if (tipoPadron == 6) {
            values.custpage_period = currentRecord.getValue("custpage_period"); // el campo que corresponda
        }

        return values;
    };

    const addParametersToUrl = (suiteletURL, parameters) => {
        for (let param in parameters) {
            if (parameters[param]) {
                suiteletURL = `${suiteletURL}&${param}=${parameters[param]}`;
            }
        }
        return suiteletURL;
    }

    const getSuiteletURL = () => {
        return url.resolveScript({
            scriptId: "customscript_l54_gen_padron_sl",
            deploymentId: "customdeploy_l54_gen_padron_sl",
            returnExternalUrl: false
        });
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        volver: volver
    };
});