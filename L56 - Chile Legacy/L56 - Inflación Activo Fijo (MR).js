/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@NAmdConfig /SuiteScripts/L56 - configuration.json
 */
define(["N/record", "N/runtime", "N/email", "N/error", "LIB - Search", "L56/utilidades"],

    function (record, runtime, email, error, libSearch, utilities) {

        const proceso = "Inflación Activo Fijo (MR)";
        
        let { InitSearch } = libSearch;
            InitSearch = new InitSearch();

        String.prototype.lpad = function (padString, length) {
            var str = this;
            while (str.length < length)
                str = padString + str;
            return str;
        }

        function getParameters() {
            try {
                let parameters = new Object();
                let currScript = runtime.getCurrentScript();

                parameters.subsidiary = currScript.getParameter({ name: "custscript_l56_inflation_asset_mr_sub"});
                parameters.assetType = currScript.getParameter({ name: "custscript_l56_inflation_asset_mr_type"});
                parameters.input = JSON.parse(currScript.getParameter({ name: "custscript_l56_inflation_asset_mr_input"}));
                parameters.assetType = parameters.assetType.split("\u0005")

                log.audit(proceso, "Parámetros recibidos: " + JSON.stringify(parameters));
                return parameters;
            } catch (excepcion) {
                log.error("getParameters", "INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }

        const getInputData = () => {

            try {
                log.audit(proceso, "GetInputData - INICIO");

                let parameters = getParameters();
                    
                const filtros = buildFilters(parameters);
                let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
                
                const savedSearch = InitSearch.getSavedSearch("customsearch_l56_fam_altdepreciation", filters);
                
                return savedSearch;

            } catch (error) {
                log.error("GetInputData - Error", "Error obteniendo la información del suitelet y/o busquedas:" + error);
            }
        }

        function map(context) {
            let objRta = { "error": false, "idClave": context.key, "detalles_errores": [] };
            let mensaje = "";
            try {
                let parameters = getParameters(),
                    input = parameters.input,
                    saveObjJournal = null,
                    saveObjAudit = null,
                    saveObjRecord = null,
                    indexPeriods = input.rangePeriod,
                    indexCC = 1,
                    indexA = 1;

                let result = JSON.parse(context.value);
                log.debug("result", JSON.stringify(result));

                if (!utilities.isEmpty(result)){
                    const indexes = getIndexes();

                    log.debug("indexes", indexes);
                    let asset = result.values["custrecord_altdeprasset"];
                    let dateDepreciation = result.values["custrecord_altdeprstartdeprdate"];

                    let currentCost = result.values["custrecord_altdepr_currentcost"] || 0.00;
                    let assetLife = !utilities.isEmpty(result.values["custrecord_altdeprlifetime"]) && result.values["custrecord_altdeprlifetime"] != "0" ? result.values["custrecord_altdeprlifetime"] : 1;
                    let depreciationPeriod = !utilities.isEmpty(result.values["custrecord_altdeprcurrentage"]) ? result.values["custrecord_altdeprcurrentage"] : 0;
                    let bookValue = result.values["custrecord_altdeprnbv"] || 0.00;
                    let cumulativeDepreciation = result.values["custrecord_altdeprcd"];
                    let purchasedate = result.values["custrecord_assetpurchasedate.CUSTRECORD_ALTDEPRASSET"];
                    
                    
                    if(getComparePeriods(purchasedate,indexPeriods[0].startdate, "<")){ // 01/01/2025 < 01/01/2025
                        log.debug("Debio entrar aca", indexes[parameters.input.init + '_' + parameters.input.end])
                        indexCC = indexes[parameters.input.init + '_' + parameters.input.end] ? indexes[parameters.input.init + '_' + parameters.input.end] : indexes['0_' + parameters.input.end];
                    }else{                                                                                                                     
                         for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i]; // feb 2025
                            if(getComparePeriods(purchasedate,current.startdate, "<")){ // 01/01/2025 < 28/02/2025
                                indexCC = indexes[prev.internalid + '_' + indexPeriods[indexPeriods.length - 1].internalid] ? indexes[prev.internalid + '_' + indexPeriods[indexPeriods.length - 1].internalid] : indexes['0_' + indexPeriods[indexPeriods.length - 1].internalid];
                                break;
                            }
                         }
                    }

                    if(getComparePeriods(dateDepreciation,indexPeriods[0].startdate, "<")){
                        indexA = indexes[parameters.input.init + '_' + parameters.input.end] ? indexes[parameters.input.init + '_' + parameters.input.end] : indexes['0_' + parameters.input.end];
                    }else{
                        for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i];
                            if(!getComparePeriods(dateDepreciation,current.enddate, ">") && getComparePeriods(purchasedate,current.startdate, "<")){
                                indexA = indexes[prev.internalid + '_' + indexPeriods[indexPeriods.length - 1].internalid] ? indexes[prev.internalid + '_' + indexPeriods[indexPeriods.length - 1].internalid] : indexes['0_' + indexPeriods[indexPeriods.length - 1].internalid];
                                break;
                            }
                         }
                    }
                    log.debug("indices", indexCC + " ->> " + indexA);
                    if (parseFloat(indexCC, 10) < 0 || parseFloat(indexA, 10) < 0) {
                        // Saltar esta entrada, sin hacer nada
                        return;
                    }
                    //Cuentas
                    let assetAccount = result.values["custrecord_altdepr_assetaccount"];
                    let depreciationAccount = result.values["custrecord_altdepr_depraccount"];
                    let auxiliarAccount = result.values["custrecord_l56_account_auxiliar"];

                    let newCurrentCost = parseFloat(parseFloat(currentCost, 10) * parseFloat(indexCC, 10), 10);
                    let oldCurrentCost = parseFloat(parseFloat(currentCost, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                    let newCumulativeDepreciation = parseFloat(parseFloat(newCurrentCost, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                    let newBookValue = parseFloat(newCurrentCost, 10) - parseFloat(newCumulativeDepreciation, 10);
                    let amount = parseFloat(newCurrentCost, 10) - parseFloat(currentCost, 10);
                    let amortization = parseFloat(newCumulativeDepreciation, 10) - parseFloat(oldCurrentCost, 10);
                        
                    log.debug("amortization", amortization)
                    if(getComparePeriods(dateDepreciation,purchasedate, "!=")){
                        let newCurrentCost_2 = parseFloat(parseFloat(currentCost, 10) * parseFloat(indexA, 10), 10);
                        let newCumulativeDepreciation_2 = parseFloat(parseFloat(newCurrentCost_2, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                        amortization = parseFloat(newCumulativeDepreciation_2, 10) - parseFloat(oldCurrentCost, 10);
                    }

                    log.debug("Importes",newCurrentCost + " ->> " + oldCurrentCost + " ->> " + newCumulativeDepreciation + " ->> " + newBookValue + " ->> " + amortization  )
                    
                    /** Crear el Journal */
                    if ((!utilities.isEmpty(amount) && parseFloat(amount, 10) != 0) || (!utilities.isEmpty(amortization) && parseFloat(amortization, 10) != 0)) {
                        //SE CREA JOURNAL ENTRY
                        var objJournal = record.create({
                            type: record.Type.JOURNAL_ENTRY,
                            isDynamic: true,
                            defaultValues: {
                                bookje: "T" // Setting bookje parameter to T makes the journal book specific.
                            }
                        });

                        objJournal.setValue({ fieldId: "accountingbook", value: input.configuration[0].custrecord_l54_config_ajusinf_libajus }); 
                        objJournal.setValue({ fieldId: "approved", value: false });
                        objJournal.setValue({ fieldId: "memo", value: "Activo Fijo Asociado: " + asset.text });
                        objJournal.setValue({ fieldId: "custbody_l56_altdepreciation", value: result.values["internalid"].value });
                        
                        let dia  = indexPeriods[indexPeriods.length - 1].enddate.substring(0,2),
                            mes  = Number(indexPeriods[indexPeriods.length - 1].enddate.substring(3,5)) - 1,
                            anio = Number(indexPeriods[indexPeriods.length - 1].enddate.substring(6,10)),
                            mesID = indexPeriods[indexPeriods.length - 1].internalid;
                        
                        if (!utilities.isEmpty(parameters.subsidiary)) {
                            objJournal.setValue({ fieldId: "subsidiary", value: parameters.subsidiary});
                        }

                        objJournal.setValue({ fieldId: "trandate", value: new Date(anio,mes,dia)}); 
                        objJournal.setValue({ fieldId: "postingperiod", value: mesID }); 

                        objJournal.selectNewLine("line");
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: input.memo });
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: assetAccount.value });
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(amount, 10) });
                        addJournalLine(objJournal, input.mandatoryCamps)
                        objJournal.commitLine("line");
                        
                        objJournal.selectNewLine("line");
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: input.memo });
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: auxiliarAccount.value });
                        objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(amount, 10) });
                        addJournalLine(objJournal, input.mandatoryCamps)
                        objJournal.commitLine("line");
                        
                        if (!utilities.isEmpty(dateDepreciation)){
                            objJournal.selectNewLine("line");
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: input.memo });
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: auxiliarAccount.value });
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: parseFloat(amortization, 10) });
                            addJournalLine(objJournal, input.mandatoryCamps)
                            objJournal.commitLine("line");
                            
                            objJournal.selectNewLine("line");
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "memo", value: input.memo });
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: depreciationAccount.value });
                            objJournal.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: parseFloat(amortization, 10) });
                            addJournalLine(objJournal, input.mandatoryCamps)
                            objJournal.commitLine("line");
                        }
                        
                        
                        try {
                            saveObjJournal = objJournal.save({
                                           enableSourcing: false,
                                           ignoreMandatoryFields : true
                                       });
                            log.debug(proceso, "SE GENERO EL JOURNALENTRY EXITOSAMENTE - ID: " + saveObjJournal);
                        }
                        catch (e) {
                            log.error(proceso, "ERROR GENERANDO JOURNALENTRY - EXCEPTION DETALLES: " + e.message);
                            objRta.error = true;
                            mensaje = "ERROR GENERANDO JOURNALENTRY - EXCEPTION DETALLES: " + e.message;
                            objRta.detalles_errores.push(mensaje)
                        }
                    }

                    /** Ingresar la auditoria */
                    if(!utilities.isEmpty(saveObjJournal)){
                        let firstPeriod = true;

                        log.debug("indexPeriods.length", indexPeriods.length)
                        for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i];
                            let amortizationValue = !utilities.isEmpty(dateDepreciation) ? parseFloat(amortization, 10) : 0;
                            if((!getComparePeriods(dateDepreciation,current.enddate, ">") && !utilities.isEmpty(dateDepreciation)) || (getComparePeriods(purchasedate,current.startdate, "<") && !utilities.isEmpty(purchasedate)) ){
                                log.debug("prev", prev)
                                log.debug("current", current)
                                let indexCurrent = current.internalid;
    
    
                                var indexPrev = prev.internalid;
                                var valorPrev = (firstPeriod) ? currentCost : valorInicial;
                                let index = indexes[indexPrev + '_' + indexCurrent] ? indexes[indexPrev + '_' + indexCurrent] : indexes['0_' + indexCurrent];
                                index = Number(index) < 0 ? 1 : index;
                                
                                valorInicial = parseFloat(parseFloat(valorPrev, 10) * parseFloat(index, 10), 10);
                                let ajuste = parseFloat(valorInicial, 10) - parseFloat(valorPrev, 10);
    
                                var objAudit = record.create({
                                    type: "customrecord_l56_audit_inflation",
                                    isDynamic: true
                                });

                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_asset", value: asset.value });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_date_ini", value: indexPrev });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_date_end", value: indexCurrent });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_index", value: index });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_journal", value: saveObjJournal });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_ca", value: currentCost });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_nbv", value: bookValue });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_va", value: valorInicial });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_a", value: ajuste });
                                objAudit.setValue({ fieldId: "custrecord_l56_audit_inflation_amort", value: amortizationValue });
        
                                try {
                                    saveObjAudit = objAudit.save();
                                    log.debug(proceso, "SE GENERO EL HISTORIAL AJUSTE POR INFLACION EXITOSAMENTE - ID: " + saveObjAudit);
                                }
                                catch (e) {
                                    log.error(proceso, "ERROR GENERANDO EL HISTORIAL AJUSTE POR INFLACION - EXCEPTION DETALLES: " + e.message);
                                    objRta.error = true;
                                    mensaje = "ERROR GENERANDO EL HISTORIAL AJUSTE POR INFLACION - EXCEPTION DETALLES: " + e.message;
                                    objRta.detalles_errores.push(mensaje);
                                }

                                firstPeriod = false;
                            }
                            
                        }

                        /** Modificar Depreciación Alternativa  */
                        var objRecord = record.load({ type: "customrecord_ncfar_altdepreciation", id: result.id });
                        
                        objRecord.setValue({ fieldId: "custrecord_altdepr_currentcost", value: newCurrentCost });
                        objRecord.setValue({ fieldId: "custrecord_altdeprnbv", value: newBookValue });

                        try {
                            saveObjRecord = objRecord.save();
                            log.debug(proceso, "SE MODIFICO LA DEPRECIACION ALTERNATIVA EXITOSAMENTE - ID: " + saveObjRecord);
                        }
                        catch (e) {
                            log.error(proceso, "ERROR MODIFICANDO LA DEPRECIACION ALTERNATIVA - EXCEPTION DETALLES: " + e.message);
                            objRta.error = true;
                            mensaje = "ERROR MODIFICANDO LA DEPRECIACION ALTERNATIVA - EXCEPTION DETALLES: " + e.message;
                            objRta.detalles_errores.push(mensaje);
                        }
                    }
                }
                context.write(result.id, objRta);
            } catch (e) {
                log.error(proceso, "OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: " + e.message);
                objRta.error = true;
                mensaje = "OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: " + e.message;
                objRta.detalles_errores.push(mensaje);
                context.write(result.id, objRta);
            }
        }

        function summarize(summary) {
            try {
                let parameters = getParameters(),
                    totalErrors = 0,
                    arrayResults = [],
                    arrayErrors = [],
                    errorMap = false;

                log.debug(proceso, "Inicio - Summarize");

                summary.output.iterator().each(function (key, value) {

                    var objResp = JSON.parse(value);

                    log.debug(proceso, "objResp: " + JSON.stringify(objResp));

                    if (objResp.error == true) {
                        errorMap = true;
                        totalErrors++;
                        arrayErrors.push({ "ID Clave": objResp.idClave, "Detalle": objResp.detalles_errores });
                    }
                    arrayResults.push(objResp);
                    return true;
                });

                log.audit({
                    title: proceso,
                    details: "Total errores en procesamiento: " + totalErrors + ", error: " + errorMap + ", arrayResults: " + JSON.stringify(arrayResults)
                });

                var author = parameters.input.user;
                var recipients = parameters.input.user;
                var subject = "Proceso de Ajuste de Inflación a Activo Fijo";


                var errorMsg = [];
                summary.mapSummary.errors.iterator().each(function (key, value) {
                    var msg = "MAP Error: " + key + ". Error was: " + JSON.parse(value).message + "<br>";
                    errorMsg.push(msg);
                    return true;
                });

                if (errorMsg.length > 0) {
                    var e = error.create({
                        name: "ERROR_CUSTOM",
                        message: JSON.stringify(errorMsg)
                    });

                    body = "Ocurrio un error con la siguiente informacion : <br>" +
                        "Codigo de Error: " + e.name + "<br>" +
                        "Mensaje de Error: " + e.message;

                    email.send({
                        author: author,
                        recipients: recipients,
                        subject: subject,
                        body: body
                    });
                } else {
                    if (errorMap) {
                        var errorString = JSON.stringify(arrayErrors);
                        errorString = errorString.replace(/,/g, "\n").replace(/\[|\]|\"/g, "");

                        body = "Ocurrieron errores en el procesamiento" +
                            "<br> <br> Resumen de errores en el " + subject + " : <br>" + errorString;

                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: subject,
                            body: body
                        });

                    } else {

                        body = "El " + subject + " ha finalizado correctamente."

                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: subject,
                            body: body
                        });
                    }
                }
                

                log.debug(proceso, "Fin - Summarize");

            } catch (error) {
                log.error("Summarize catch error", error.message);
            }
        }

        const buildFilters = (parameters) => {
            let filtros = [];
            if (!utilities.isEmpty(parameters.subsidiary)){
                filtros.push({
                    name: "custrecord_altdepr_subsidiary",
                    operator: "ANYOF",
                    values: parameters.subsidiary
                });
            }
            
            if (!utilities.isEmpty(parameters.assetType)){
                filtros.push({
                    name: "custrecord_altdepr_assettype",
                    operator: "ANYOF",
                    values: parameters.assetType
                });
            }
           
            if (!utilities.isEmpty(parameters.input.configuration[0])){
                let accountingbook = parameters.input.configuration[0];
                log.debug("accountingbook", JSON.stringify(accountingbook))

                filtros.push({
                    name: "custrecord_altdepr_accountingbook",
                    operator: "ANYOF",
                    values: accountingbook.custrecord_l54_config_ajusinf_libajus
                });
            }

            if (!utilities.isEmpty(parameters.input.indexPeriods)){
                let indexPeriods = parameters.input.indexPeriods;
                log.debug("indexPeriods[indexPeriods.length - 1].startdate", indexPeriods[indexPeriods.length - 1].startdate)

                filtros.push({
                    name: "custrecord_assetpurchasedate",
                    join: "custrecord_altdeprasset",
                    operator: "ONORBEFORE",
                    values: indexPeriods[indexPeriods.length - 1].startdate
                });
            }

            return filtros;
        };

        const addJournalLine = (objJournal, obligCampos) => {
            obligCampos.forEach(({ fieldId, value }) => {
                if (fieldId && value !== undefined) {
                objJournal.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId,
                    value,
                    ignoreFieldChange: true
                });
                }
            });

        }

        const getIndexes = () => {
            let jsonArrayResult = {};
            let columns = ['custrecord_l56_axi_indice_per_adq', 'custrecord_l56_axi_indice_num']
            
            let array = InitSearch.getSearchCreated("customrecord_l56_axi_indice", null, columns);
            log.debug("array", array.length)

            let jsonArray = array.flatMap(reg => {
                try {
                    return JSON.parse(reg.custrecord_l56_axi_indice_num);
                } catch (e) {
                    console.warn("Error al parsear JSON:", e);
                    return [];
                }
            });
            
            jsonArray.forEach(item => {
                jsonArrayResult[`${item.row}_${item.col}`] = item.value;
            });
            
            return jsonArrayResult;
        }

        const getComparePeriods = (date1, date2, operador) =>{
            let dia1  = date1.substring(0,2),
                mes1  = Number(date1.substring(3,5)) - 1,
                anio1 = Number(date1.substring(6,10)),
                resultDate1 = new Date(anio1,mes1,dia1);

            let dia2  = date2.substring(0,2),
                mes2  = Number(date2.substring(3,5)) - 1,
                anio2 = Number(date2.substring(6,10)),
                resulDate2 = new Date(anio2,mes2,dia2);

            var operator = {
                '<': function(a, b) { return a < b; },
                '<=': function(a, b) { return a <= b; },
                '>': function(a, b) { return a > b; },
                '>=': function(a, b) { return a >= b; },
                '==': function(a, b) { return a.getTime() == b.getTime(); },
                '!=': function(a, b) { return a.getTime() != b.getTime(); }
            };

            if (!operator[operador]) {
                throw new Error('Operador no válido: ' + operador);
            }

            return operator[operador](resultDate1, resulDate2);
        }

        
        return {
            getInputData: getInputData,
            map: map,
            // // reduce: reduce,
            summarize: summarize
        }
    });