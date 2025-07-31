/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NAmdConfig /SuiteScripts/L54 - configuration.json
 *@NModuleScope Public
 */
 define(["N/currentRecord", "N/ui/dialog", "N/search", "N/record", "N/url"],

    function (currentRecord, dialog, search, record, url) {
       

        var isEmpty = function (val) { return val == null || val == undefined || val == "" };
        
        function pageInit(scriptContext){
        }

        function saveRecord(context) {
            var options = {
                title: "Atencion",
                message: "Este proceso puede tardar algunos minutos. ¿Desea continuar?"
            };

            let configuration = getConfiguration(currentRecord.get().getValue({ fieldId: "custpage_subsidiary" }));
            
            if(!configuration){
                alert_msg("No existen configuración para la subsidiaria seleccionada.");
                return false;
            }

            let indexInit = getIndex(currentRecord.get().getValue({ fieldId: "custpage_period_init" }));
            let indexEnd = getIndex(currentRecord.get().getValue({ fieldId: "custpage_period_end" }))

            if(!indexInit || !indexEnd ){
                alert_msg("No existen indices para los periodos seleccionados.");
                return false;
            }


            return true;
        }

        const getIndex = (parameters) => {
            let customSearch = search.create({
                type: "customrecord_l54_axi_indice",
                filters:[
                            ["isinactive", "onorbefore", "F"],
                            "AND",
                            ["custrecord_l54_axi_indice_mes", "anyof", parameters],
                        ],
                columns: ["custrecord_l54_axi_indice_num"]
            })
            
            let customResult = customSearch.run().getRange(0,1);
                
            if(customResult.length != 0) return true; else return false;
        }

        const getConfiguration = (parameters) => {
            
            let customSearch = search.create({
                type: "customrecord_l54_config_ajust_inf",
                filters:[
                            ["custrecord_l54_config_ajusinf_subsid", "anyof", parameters],
                            "AND",
                            ["isinactive", "onorbefore", "F"]
                        ],
                columns: ["custrecord_l54_config_ajusinf_libajus"]
            })
            let customResult = customSearch.run().getRange(0,1);
                
            if(customResult.length != 0) return true; else return false;
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

        const deleteRecords = (journal, asset) => {
            let customRecord = "customrecord_l54_audit_inflation";
            var messague  = {
                title: "Atencion",
                message:`Se eliminara todos los registros que tengan asociado este journal.<br>
                        <br>
                        <b>Este proceso puede demorar un poco.</b> ¿Desea continuar?`
            };
        
            console.log("messague".messague);

            function success(result) {
                console.log("El usuario selecciono: " + result);
                if (result == true) {
                    let customSearch = search.create({
                        type: customRecord,
                        filters:[
                                    ["custrecord_l54_audit_inflation_journal","anyof", journal]
                                ],
                        columns: [
                            search.createColumn({
                               name: "internalid",
                               summary: "GROUP",
                               label: "ID interno"
                            }),
                            search.createColumn({
                               name: "custrecord_l54_audit_inflation_ca",
                               summary: "GROUP",
                               label: "Costo Actual Historico"
                            }),
                            search.createColumn({
                               name: "custrecord_l54_audit_inflation_nbv",
                               summary: "GROUP",
                               label: "Valor en Libros Historico"
                            }),
                            search.createColumn({
                               name: "custbody_l54_altdepreciation",
                               join: "CUSTRECORD_L54_AUDIT_INFLATION_JOURNAL",
                               summary: "GROUP",
                               label: "AR - Depreciación Alternativa Asociada"
                            })
                         ]
                    })
                    let customResult = customSearch.run().getRange(0,100);
                    console.log("customResult", customResult.length)
                    
                    if (customResult.length != 0) {
                        for (var i in customResult) {
                            console.log("customResult: " + customResult[i].getValue({ name: "internalid", summary: "GROUP" }))
                            record.delete({
                                type: customRecord,
                                id: customResult[i].getValue({ name: "internalid", summary: "GROUP" })
                            });

                            var currentCost = customResult[i].getValue({ name: "custrecord_l54_audit_inflation_ca", summary: "GROUP" });
                            var bookValue = customResult[i].getValue({ name: "custrecord_l54_audit_inflation_nbv", summary: "GROUP" });
                            var depreciation = customResult[i].getValue({ name: "custbody_l54_altdepreciation", join: "custrecord_l54_audit_inflation_journal", summary: "GROUP"});
                        }
                    }
                    console.log("journal", journal)
                    record.delete({
                        type: "journalentry",
                        id: journal
                    });

                    if(!isEmpty(currentCost) && !isEmpty(bookValue)){
                        let customRecord = record.load({
                            type: "customrecord_ncfar_altdepreciation",
                            id: depreciation
                        });

                        customRecord.setValue({ fieldId: "custrecord_altdepr_currentcost", value: currentCost });
                        customRecord.setValue({ fieldId: "custrecord_altdeprnbv", value: bookValue });

                        try {
                            var idTmp = customRecord.save();
                            log.debug("DeleteRecord", "SE MODIFICO LOS VALORES DE LA DEPRECIACIÓN ALTERNATIVA CORRECTAMENTE: " + idTmp);

                        }catch (e) {
                            log.error("DeleteRecord", "ERROR AL MODIFICAR LOS VALORES DE LA DEPRECIACIÓN ALTERNATIVA CORRECTAMENTE: " + e.message);
                           
                        }
                    }

                    var redirect = url.resolveRecord({
                        recordType: "customrecord_ncfar_asset",
                        recordId: asset,
                        isEditMode: false
                      });
                  
                    window.location.href = redirect;
                }
            }

            function failure(reason) {
                console.log("Algo fallo al intentar ejecutar el proceso!", reason);
                return false;
            }

            dialog.confirm(messague).then(success).catch(failure);
            return true;
        }

        const downloadExcel = (parameters) => {
            var obj = currentRecord.get();

            var custpage_subsidiary = obj.getValue({
                    fieldId: 'custpage_subsidiary'
                }),
                custpage_asset_type = obj.getValue({
                    fieldId: 'custpage_asset_type'
                }),
                custpage_period_init = obj.getValue({
                    fieldId: 'custpage_period_init'
                }),
                custpage_period_end = obj.getValue({
                    fieldId: 'custpage_period_end'
                });
                console.log("custpage_subsidiary", custpage_subsidiary)

                
            if (!custpage_subsidiary) {
                alert('Por favor, complete todos los campos obligatorios.');
                return;
            }
            window.open(parameters + "&custpage_subsidiary=" + custpage_subsidiary + "&custpage_asset_type=" + custpage_asset_type + "&custpage_period_init=" + custpage_period_init + "&custpage_period_end=" + custpage_period_end, '_blank')
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,
            deleteRecords: deleteRecords,
            downloadExcel: downloadExcel
        }
    });
