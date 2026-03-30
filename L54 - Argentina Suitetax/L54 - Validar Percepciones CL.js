
/**
 * @NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration.json
 * @NModuleScope Public
 */
define(["L54/utilidades","N/record", "N/error", "N/search"],
    function (utilidades, record, error, search) {
        /* eslint-disable */
       
        function validPercepciones(rec) {

            console.log('Inicio de la fnnnn Validar Percepciones ');
	        console.log('xdd ' + rec.getLineCount('item'))
            //var ivaParam = context.getSetting('SCRIPT', 'custscript_l54_per_iva_valid_nc');
            var ivaParam = 1;
            var esParciale = false;
            var totalTransRef = 0;
            var dateTransRef = null;
            var eliminoPercepciones = false;

            var zonaImpuestos = getZonaImpuestos();

            var transaccion_referencia = rec.getValue({
                fieldId: "custbody_l54_transaccion_referencia"
            });

            if (!transaccion_referencia) {
                transaccion_referencia = rec.getValue({
                    fieldId: "createdfrom"
                });
            }

            var ajuste_error_calculo = rec.getValue({
                fieldId: "custbody_l54_nc_ajuste_error_calculo"
            });

            if (transaccion_referencia) {

                try {
                    //obtengo información de la referencia de la NC
                    var resultadoTransRef = getInfoTransReferencia(transaccion_referencia);
                    log.debug("validPercepciones", "resultadoTransRef: ", resultadoTransRef);

                    if (resultadoTransRef) {
                        var idTransRef = resultadoTransRef.id;
                        var recordTypeTransRef = resultadoTransRef.type;
                        var referenciaOfTransRef = resultadoTransRef.tranref;
                        totalTransRef = resultadoTransRef.total;
                        dateTransRef = resultadoTransRef.data;

                        if (recordTypeTransRef == "RtnAuth") {
                            log.debug("validPercepciones", "resultadoTransRef: Es returnauthorization");

                            if (referenciaOfTransRef) {
                                log.debug("validPercepciones", "resultadoTransRef: Returnauthorization con transacciones asociadas: ID " + referenciaOfTransRef);
                                var refReturnAut = getInfoTransReferencia(parseInt(referenciaOfTransRef));

                                if (refReturnAut) {
                                    var idRefReturnAut = refReturnAut.id;
                                    var recordTypeRefAut = refReturnAut.type;

                                    if (recordTypeRefAut == "CustInvc") {
                                        totalTransRef = refReturnAut.total;
                                    }
                                    var dateTransRef = refReturnAut.data;
                                    log.debug("validPercepciones", "refReturnAut: totalTransRef (Transaccion Relacionada a returnauthorization): " + totalTransRef + " - idRefReturnAut (Transaccion Relacionada a returnauthorization): " + idRefReturnAut);
                                }
                            }
                        }

                        totalTransRef = parseFloat(totalTransRef, 10);

                    }

                    var totalNC = 0;

                    var dateNC = rec.getValue({
                        fieldId: "trandate"
                    });

                    var lineCount = rec.getLineCount({ sublistId: "item" });

                    log.debug("validPercepciones", "1o FOR Items: Para soma total desconsiderando percepciones, " +
                        "e para validar linhas eliminando percepciones fora do periodo, ou não permitidas " +
                        "em NC de devolução e ajustes - lineCount: " + lineCount);

                    for (var i = 0; i < lineCount; i++) {

                        var eliminaPercepcioneLinea = false;
                        var dev_total = false;
                        var dev_parc = false;
                        var dev_ajuste = false;
                        var dev_perido = null;

                        var esPercepcion = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_l54_es_percepcion",
                            line: i
                        });

                        var esProcesoPV = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_l54_pv_creada",
                            line: i
                        });

                        var tipoItem = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "itemtype",
                            line: i
                        });

                        var item_display = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "item_display",
                            line: i
                        });

                        var item_line = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "line",
                            line: i
                        });

                        var valorBrutoLinea = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "grossamt",
                            line: i
                        });

                        var jurisdiccionLinea = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_l54_jurisd_iibb_lineas",
                            line: i
                        });

                        var tipoPercep = rec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_l54_tipo_percepcion_vtas",
                            line: i
                        });

                        var typesNoAcceptedforSum = ["Description", "Subtotal", "Discount", "Markup"];

                        console.log("Tempe " + esPercepcion + "->>" + esProcesoPV + "->> " + tipoItem + "->>" + jurisdiccionLinea)
                        
                        if (!isEmpty(esPercepcion) && !esPercepcion && !isEmpty(esProcesoPV) && !esProcesoPV && typesNoAcceptedforSum.indexOf(tipoItem) == -1) {
                            totalNC = totalNC + parseFloat(valorBrutoLinea);

                        }else if ((!isEmpty(esPercepcion) && esPercepcion && jurisdiccionLinea) || (!isEmpty(esProcesoPV) && esProcesoPV && jurisdiccionLinea)) {

                            var getJurisdiccion = zonaImpuestos.filter(function (jurisdiccion) {
                                return jurisdiccion.id == jurisdiccionLinea;
                            });

                            console.log("getJurisdiccion: " + JSON.stringify(getJurisdiccion));

                            if (getJurisdiccion.length > 0) {
                                getJurisdiccion = getJurisdiccion[0];
                                dev_total = getJurisdiccion.dev_total;
                                dev_parc = getJurisdiccion.dev_parc;
                                dev_ajuste = getJurisdiccion.dev_ajuste;
                                dev_perido = getJurisdiccion.dev_perido;
                            }

                            if (!isEmpty(dev_total) && !dev_total && !isEmpty(dev_parc) && !dev_parc && !isEmpty(dev_ajuste) && !dev_ajuste) {

                                eliminaPercepcioneLinea = true;
                                

                            } else if (!isEmpty(dev_perido)) {

                                var dateLimit = getDateLimit(dateTransRef, dev_perido);
                                
                                if (dateNC > dateLimit) {

                                    console.log("eliminaPercepcioneLinea = true (dateLimit: "+dateLimit+", dateNC: "+dateNC+")");
                                    eliminaPercepcioneLinea = true;

                                }

                            }

                            if (eliminaPercepcioneLinea && (tipoPercep != ivaParam)) {
                                var taxdetailsReferencePercep = rec.getCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "taxdetailsreference",
                                    line: i
                                });
                                log.debug("validPercepciones", "taxdetailsReferencePercep " + taxdetailsReferencePercep );
                                var lineNumber = -1;

                                var linecountTD = rec.getLineCount({
                                    sublistId: "taxdetails"
                                });
                                log.debug("validPercepciones", "lineCountTD: " + linecountTD );
                                for(var j = 0; j < linecountTD; j++){
                                    var taxdetailsReferenceLine = rec.getCurrentSublistValue({
                                        sublistId: "taxdetails",
                                        fieldId: "taxdetailsreference",
                                        line: j
                                    });
                                    log.debug("validPercepciones", "taxdetailsReferenceLine  "+i+": " + taxdetailsReferenceLine );
                                    if(taxdetailsReferenceLine == taxdetailsReferencePercep){
                                        lineNumber=j;
                                    }
                                }
                                log.debug("validPercepciones", "lineNumber: " + lineNumber );
                                if (lineNumber != -1) {
                                    rec.removeLine({ sublistId: "taxdetails", line: lineNumber });
                                    //rec.selectNewLine({ sublistId: "taxdetails" });
                                }
                                rec.removeLine({
                                    sublistId: "item",
                                    line: i,
                                    ignoreRecalc: true
                                });
                                
                                log.debug("validPercepciones", "Eliminado item_display: " + item_display + ", i: " + i);

                                lineCount = rec.getLineCount({
                                    sublistId: "item"
                                });

                                i = i - 1;

                                eliminoPercepciones = true;

                                log.debug("validPercepciones", "lineCount: " + lineCount + ", i: " + i);

                            }

                        }

                    }
                    console.log("if de totales: ", totalNC);
                    
                    if (totalNC > 0){

                        var lineCount2 = rec.getLineCount({ sublistId: "item" });

                        log.debug("validPercepciones", "2o FOR Items: Para validar linhas eliminando percepciones não permitidas " +
                            "em NC de devolução total, parcial ou de ajuste, conforme RT Zona Impuestos - lineCount2: " + lineCount2);

                        esParciale = (parseFloat(parseFloat(totalTransRef, 10) - parseFloat(totalNC, 10), 10)) > 0.07 ? true : false;
                        log.debug("totalNC: " + totalNC + " totalTransRef: " + totalTransRef);
                        log.debug("validPercepciones", "esParciale: " + esParciale);

                        for (var j = 0; j < lineCount2; j++) {

                            eliminaPercepcioneLinea = false;
                            dev_total = false;
                            dev_parc = false;
                            dev_ajuste = false;

                            esPercepcion = rec.getCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_l54_es_percepcion",
                                line: j
                            });

                            esProcesoPV = rec.getCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_l54_pv_creada",
                                line: j
                            });

                            if (esPercepcion && esProcesoPV) {

                                item_display = rec.getCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "item_display",
                                    line: j
                                });

                                item_line = rec.getCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "line",
                                    line: j
                                });

                                jurisdiccionLinea = rec.getCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "custcol_l54_jurisd_iibb_lineas",
                                    line: j
                                });

                                getJurisdiccion = zonaImpuestos.filter(function (jurisdiccion) {
                                    return jurisdiccion.id == jurisdiccionLinea;
                                });

                                log.debug("validPercepciones", "getJurisdiccion: " + getJurisdiccion);

                                if (getJurisdiccion.length > 0) {
                                    getJurisdiccion = getJurisdiccion[0];
                                    dev_total = getJurisdiccion.dev_total;
                                    dev_parc = getJurisdiccion.dev_parc;
                                    dev_ajuste = getJurisdiccion.dev_ajuste;
                                    dev_perido = getJurisdiccion.dev_perido;
                                }

                                if (esParciale && !isEmpty(dev_parc) && !dev_parc && !isEmpty(ajuste_error_calculo) && !ajuste_error_calculo) {

                                    log.debug("validPercepciones", "eliminaPercepcioneLinea = true (esParciale && !dev_parc)");
                                    
                                        eliminaPercepcioneLinea = true;
                                    

                                } else if (!isEmpty(ajuste_error_calculo) && ajuste_error_calculo  && !isEmpty(dev_ajuste)&& !dev_ajuste) {

                                    log.debug("validPercepciones", "eliminaPercepcioneLinea = true (ajuste_error_calculo && !dev_ajuste)");
                                    eliminaPercepcioneLinea = true;
                                    

                                } else if (!esParciale && !isEmpty(dev_total) && !dev_total && !isEmpty(ajuste_error_calculo) && !ajuste_error_calculo) {

                                    log.debug("validPercepciones", "eliminaPercepcioneLinea = true (!esParciale && !dev_total)");
                                    eliminaPercepcioneLinea = true;
                                    

                                }

                                if (eliminaPercepcioneLinea) {
                                    var taxdetailsReferencePercep = rec.getCurrentSublistValue({
                                        sublistId: "item",
                                        fieldId: "taxdetailsreference",
                                        line: j
                                    });
                                    var lineNumber = rec.findSublistLineWithValue({
                                        sublistId: "taxdetails",
                                        fieldId: "taxdetailsreference",
                                        value: taxdetailsReferencePercep
                                    });
                                    rec.removeLine({
                                        sublistId: "item",
                                        line: j,
                                        ignoreRecalc: true
                                    });
                                    log.debug('todo bien' , lineNumber)
                                    if (lineNumber != -1) {
                                        try{
                                            rec.removeLine({ sublistId: "taxdetails", line: lineNumber });
                                            //rec.selectNewLine({ sublistId: "taxdetails" });
                                        
                                        }catch(e){
                                            log.debug('Eliminado por el Client')
                                        }
                                    }

                                    log.debug("validPercepciones", "Eliminado item_display: " + item_display + ", j: " + j);

                                    lineCount2 = rec.getLineCount({
                                        sublistId: "item"
                                    });

                                    j = j - 1;

                                    eliminoPercepciones = true;

                                    log.debug("validPercepciones", "lineCount2: " + lineCount2 + ", j: " + j);

                                }

                            }

                        }

                    }

                    if (eliminoPercepciones) {

                        rehacerTotales(rec);
                    }

                } catch (error) {
                    log.error("error", error.message);
                    throw error.message;
                }

            }

        }
        
        function isEmpty(value) {
            return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
        }
        
        function rehacerTotales(rec) {

            const lineCount = rec.getLineCount({ sublistId: "apply" });
            const idTransApply = [];

            log.debug("rehacerTotales", "Para reahacer Totales en \"Apply\" cuando percepciones son eliminadas - lineCount: " + lineCount);

            for (let i = 0; i < lineCount; i++) {

                let transApply = rec.getCurrentSublistValue({
                    sublistId: "apply",
                    fieldId: "apply",
                    line: i
                });

                let idApply = rec.getCurrentSublistValue({
                    sublistId: "apply",
                    fieldId: "internalid",
                    line: i
                });

                log.debug("rehacerTotales", "transApply: " + transApply + " idApply: " + idApply);
                log.debug("hola")
                if (transApply == true) {
                    log.debug("entro al  if (transApply == true)", i)
                    idTransApply.push({
                        internalId: idApply,
                        line: i
                    });

                    rec.setCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "apply",
                        line: i,
                        value: false
                    });

                    log.debug("rehacerTotales", "Elimina Tilde idApply: " + idApply);

                    transApply = rec.getCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "apply",
                        line: i
                    });

                    idApply = rec.getCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "internalid",
                        line: i
                    });

                    log.debug("rehacerTotales", "transApply: " + transApply + " idApply: " + idApply);

                }

            }

            log.debug("rehacerTotales", "idTransApply: " + JSON.stringify(idTransApply));

            if (idTransApply.length > 0) {
                for (let j = 0; j < idTransApply.length; j++) {
                    rec.setCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "apply", //idTransApply[j].internalId,
                        line: idTransApply[j].line,
                        value: true
                    });

                    log.debug("rehacerTotales", "Tilda idTransApply: " + idTransApply[j].internalId);

                }
            }

            return;

        }

        
        function getDateLimit(dateTransRef, _months){
        
            console.log('getDateLimit dateTransRef: ' + dateTransRef + ' _months '+ _months);     
        
            var result = formatDate(dateTransRef);
        
            result.setDate(15); //fixo devido a soma de meses considerar sempre 30 dias
            result.setMonth(result.getMonth() + (Number(_months)+1)); //adiciono mais 1 mes para voltar o ultimo dia do mes
            result.setDate(1); //fixo dia 1 do mes subsequente
            result.setDate(result.getDate() - 1); //subtraio 1 dia para fixar ultimo dia do mes desejado
        
            log.audit('getDateLimit', 'Data Limite result '+ result);     
        
            return result;
        }
        
        function formatDate(_dateTransfRef) {
            var splitDate = _dateTransfRef.split("/");
            var dataReturn = new Date();
            dataReturn.setDate(splitDate[0]);
            dataReturn.setMonth(splitDate[1]-1);
            dataReturn.setFullYear(splitDate[2]);
        
            return dataReturn;
        }
        
        function getZonaImpuestos() {

            const allZonaImpuestos = [];

            const _columns = {
                name: { name: "name", sort: search.Sort.ASC },
                dev_total: { name: "custrecord_l54_zona_impuestos_dev_total" },
                dev_parc: { name: "custrecord_l54_zona_impuestos_dev_parc" },
                dev_ajuste: { name: "custrecord_l54_zona_impuestos_dev_ajuste" },
                dev_perido: { name: "custrecord_l54_zona_impuestos_dev_perido" }
            };

            search.create({
                type: "customrecord_l54_zona_impuestos",
                filters: (
                    [
                        ["isinactive", "is", "F"]
                    ]),
                columns: (
                    [
                        _columns.name,
                        _columns.dev_total,
                        _columns.dev_parc,
                        _columns.dev_ajuste,
                        _columns.dev_perido
                    ])
            }).run().each(function (_zonaImpuestos) {
                allZonaImpuestos.push({
                    id: _zonaImpuestos.id,
                    name: _zonaImpuestos.getValue(_columns.name),
                    dev_total: _zonaImpuestos.getValue(_columns.dev_total),
                    dev_parc: _zonaImpuestos.getValue(_columns.dev_parc),
                    dev_ajuste: _zonaImpuestos.getValue(_columns.dev_ajuste),
                    dev_perido: _zonaImpuestos.getValue(_columns.dev_perido)
                });
                return true;
            });

            log.audit("getZonaImpuestos", "allZonaImpuestos: " + JSON.stringify(allZonaImpuestos));
            return allZonaImpuestos;
        }
        
        function getInfoTransReferencia(transaccion_referencia) {

            log.audit("getInfoTransReferencia", "transaccion_referencia: " + transaccion_referencia);

            var result = {
                id: "",
                total: 0,
                type: "",
                tranref: "",
                data: ""
            };

            const filtros = [];
            const filtro = {};
            filtro.name = "internalid";
            filtro.operator = "ANYOF";
            filtro.values = transaccion_referencia;
            filtros.push(filtro);

            const objResultSet = utilidades.searchSavedPro("customsearch_l54_imp_transaccion_ref_2", filtros);
            const resultSet = objResultSet.objRsponseFunction.result;
            const resultSearch = objResultSet.objRsponseFunction.search;

            if (objResultSet.error) {
                const mensaje = "Error Consultando searchSavedPro beforeLoad - customsearch_l54_imp_transaccion_ref_2 - Detalles del Error: " + objResultSet.descripcion;
                log.error("getInfoTransReferencia", "Error: " + mensaje);

            } else if ((!isEmpty(resultSet)) && (resultSet.length > 0)) {
                result.id = resultSet[0].getValue({ name: resultSearch.columns[0] }, "");
                result.total = resultSet[0].getValue({ name: resultSearch.columns[1] }, "");
                result.type = resultSet[0].getValue({ name: resultSearch.columns[2] }, "");
                result.tranref = resultSet[0].getValue({ name: resultSearch.columns[3] }, "");
                result.data = resultSet[0].getValue({ name: resultSearch.columns[4] }, "");

            }

            log.audit("getInfoTransReferencia", "result: " + JSON.stringify(result));

            return result;
        }
        
        return {
            validPercepciones: validPercepciones,
        };
    });