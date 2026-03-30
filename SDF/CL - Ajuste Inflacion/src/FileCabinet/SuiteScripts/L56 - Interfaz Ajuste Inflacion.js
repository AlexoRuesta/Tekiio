/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/L56 - configuration.json
 *@NModuleScope Public
 */

define(["N/search", "N/runtime", "N/log", "N/ui/serverWidget", "N/task", "N/url","L56/utilidades"],
    function(search, runtime, log, serverWidget, task, url, utilities) {
        const proceso = "Ajuste Inflacion (SuiteLet)";
        
        function onRequest(context) {

            const form = serverWidget.createForm({
                title: "Panel de Generación de Corrección Monetaria"
            });

            log.debug({
                title: proceso,
                details: "INICIO Dibujando SuiteLet"
            });

            try {

                //Asociar a un Script de cliente ó JS en NS:
                form.clientScriptModulePath = "./L56 - Interfaz Ajuste Inflacion (CL).js";

                if (context.request.method === "GET") {
                    const filtrosGroup = form.addFieldGroup({
                        id : 'filtros',
                        label : 'Filtros'
                    });
                    const resultadoGroup = form.addFieldGroup({
                        id : 'Resultado',
                        label : 'Resultado'
                    });
                    const periodIni = form.addField({
                        id: "custpage_field_pini",
                        label: "PERIODO INICIO",
                        type: serverWidget.FieldType.SELECT,
                        container: "filtros",
                        source: 'accountingperiod'
                    });
                    periodIni.isMandatory = true;
                    const periodFin = form.addField({
                        id: "custpage_field_pfin",
                        label: "PERIODO FIN",
                        type: serverWidget.FieldType.SELECT,
                        container: "filtros",
                        source: 'accountingperiod'
                    });
                    periodFin.isMandatory = true;

                    const checkJournal = form.addField({
                        id: "custpage_field_check_jour",
                        label: "GENERAR ASIENTO DE AJUSTE",
                        type: serverWidget.FieldType.CHECKBOX,
                        container: "filtros",
                    });
                    let oneWorld = runtime.isFeatureInEffect({
                        feature: 'MULTIBOOK'
                    });

                    let campoSubsidiaria = null;
                    if (oneWorld == true) {
                        campoSubsidiaria = form.addField({
                            id: "custpage_subsidiaria",
                            label: "Subsidiaria",
                            type: serverWidget.FieldType.SELECT,
                            source: "subsidiary",
                            container: "filtros"
                        });
                    } else {
                        campoSubsidiaria = form.addField({
                            id: "custpage_subsidiaria",
                            label: "Subsidiaria",
                            type: serverWidget.FieldType.TEXT
                        });
                        campoSubsidiaria.defaultValue = "";
                        campoSubsidiaria.isDisplay = false;
                    }
                    if (oneWorld) {
                        campoSubsidiaria.isMandatory = true;
                    }
                    //Subsidiaria del Usuario por Defecto
                    const userContext = runtime.getCurrentUser();
                    if (oneWorld) {
                        const subsidiariaUsuario = userContext.subsidiary;
                        if (!utilities.isEmpty(subsidiariaUsuario)) {
                            campoSubsidiaria.defaultValue = subsidiariaUsuario;
                        }
                    }

                    // INICIO SUBLISTA
                    let sublistLogs = form.addSublist({
                        id: 'sublist_logs',
                        type: serverWidget.SublistType.STATICLIST,
                        label: 'Logs de Ejecución',
                    });

                    let fieldUrl = sublistLogs.addField({
                        id: 'sublistfield_url',
                        label: 'Ver',
                        type: serverWidget.FieldType.URL,
                    });
                    fieldUrl.linkText = 'Ver';
                    sublistLogs.addField({
                        id: 'sublistfield_id',
                        label: '#',
                        type: serverWidget.FieldType.TEXT,
                    });
                    sublistLogs.addField({
                        id: 'sublistfield_estado',
                        label: 'ESTADO',
                        type: serverWidget.FieldType.TEXT
                    })
                    sublistLogs.addField({
                        id: 'sublistfield_subsid',
                        label: 'SUBSIDIARIA',
                        type: serverWidget.FieldType.TEXT
                    })
                    sublistLogs.addField({
                        id: 'sublistfield_periods',
                        label: 'PERIODOS',
                        type: serverWidget.FieldType.TEXT
                    })

                    sublistLogs.addField({
                        id: 'sublistfield_journal',
                        label: 'PROPUESTA',
                        type: serverWidget.FieldType.TEXT
                    });
                    
                    sublistLogs.addField({
                        id: 'sublistfield_report',
                        label: 'Reporte (Cuentas)',
                        type: serverWidget.FieldType.TEXT
                    });
                    let logLists = getLogs();

                    for(let i=0;i<logLists.length;i++){
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_url',
                            line: i,
                            value: logLists[i].logUrl,
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_id',
                            line: i,
                            value: logLists[i].logId,
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_estado',
                            line: i,
                            value: logLists[i].logEstado
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_subsid',
                            line: i,
                            value: logLists[i].logSubsid || ' '
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_periods',
                            line: i,
                            value: logLists[i].logPeriods || ' '
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_journal',
                            line: i,
                            value: logLists[i].logJournal || ' '
                        });
                        sublistLogs.setSublistValue({
                            id: 'sublistfield_report',
                            line: i,
                            value: logLists[i].logReport || ' '
                        });
                        
                    }


                    const myInlineHtml = form.addField({
                        id: "custpage_field_texto",
                        label: "Mensaje",
                        type: serverWidget.FieldType.INLINEHTML,
                        //container: "Resultado"
                    });
                    /*myInlineHtml.defaultValue = "<html><body><h2><u>Nota:</u> Desde este panel es posible generar los reportes y asiento de Ajuste de Inflación Integral.</h2></body></html>";
                    myInlineHtml.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTCOL
                    });*/

                    

                    form.addSubmitButton({
                        label: "Ejecutar Ajuste de Inflación"
                    });
                    context.response.writePage(form);

                } else {
                    let urlFinal = ''
                    if (utilities.isEmpty(urlFinal)) {
                        urlFinal = "https://system.na1.netsuite.com";
                    }
                    let periodIniSelected = context.request.parameters.custpage_field_pini
                    let periodFinSelected = context.request.parameters.custpage_field_pfin
                    let checkGenerarJournal = context.request.parameters.custpage_field_check_jour === 'T'
                    let subsidiarySelected = context.request.parameters.custpage_subsidiaria
                    let email = runtime.getCurrentUser().id;
                    
                    log.audit('params', {periodIniSelected,periodFinSelected,subsidiarySelected,checkGenerarJournal})
                    let configAjusteInflacion = getConfigAjusteInflacion(subsidiarySelected)
                    log.audit('configAjusteInflacion',configAjusteInflacion)
                    let mensaje = "Se envió a procesar exitosamente.";
                    let errorProceso = false;
                    if(utilities.isEmpty(configAjusteInflacion)){
                        errorProceso = true;
                        mensaje = "No existe configuración para la Subsidiaria seleccionada";
                    }
                    if (utilities.isEmpty(periodIniSelected)) {
                        errorProceso = true;
                        mensaje = "Falta Periodo Inicio";
                    }else if (utilities.isEmpty(periodFinSelected)) {
                        errorProceso = true;
                        mensaje = "Falta Periodo Fin";
                    }else if (utilities.isEmpty(subsidiarySelected)) {
                        errorProceso = true;
                        mensaje = "Falta Subsidiary";
                    }else if(periodIniSelected == periodFinSelected) {
                        errorProceso = true;
                        mensaje = "No puede seleccionar el mismo periodo para el ajuste";
                    }
                    
                    try {
                        const myInlineHtml = form.addField({
                            id: "custpage_field_texto",
                            label: "Mensaje",
                            type: serverWidget.FieldType.INLINEHTML
                        });
                        myInlineHtml.defaultValue = `<html><body><h2> ${mensaje} </h2></body></html>`;

                        if (!utilities.isEmpty(urlFinal)) {

                            const direccion = form.addField({
                                id: "enterempslink",
                                label: " ",
                                type: serverWidget.FieldType.URL
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.INLINE
                            });
                            direccion.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
                            });

                            const urlDeployScript = url.resolveScript({
                                //idScript: planilla de componentes
                                scriptId: "customscript_l56_interfaz_ajust_inf",
                                //id implementación
                                deploymentId: "customdeploy_l56_interfaz_ajust_inf",
                                returnExternalUrl: false
                            });
                            direccion.linkText = "Volver";
                            direccion.defaultValue = urlDeployScript;
                        }
                        
                    } catch (error) {

                        log.error({
                            title: proceso,
                            details: `'Error NetSuite Excepción -  ${proceso}  - Detalles: ${error.message}`
                        });
                    }
                    let isUserContador = false;
                    try{
                        const userContext = runtime.getCurrentUser();
                        const currentRoleId = userContext.role;
                        if(!utilities.isEmpty(configAjusteInflacion.rolesAutorizados)){
                            const rolesList = configAjusteInflacion.rolesAutorizados.split(',');
                            isUserContador = rolesList.includes(String(currentRoleId))
                        }
                    } catch (error) {
                        log.error({
                            title: proceso,
                            details: `'Error NetSuite Excepción - Validacion Roles  - Detalles: ${error.message}`
                        });
                    }

                    if (errorProceso == false) {
                        const respuesta = {
                            error: false,
                            mensaje: "",
                            estado: ""
                        };

                        // Llamo a Script Programado para Generar el TXT
                        try {
                            const mrTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                params: {
                                    "custscript_l56_ajustinflacion_periodini":  periodIniSelected ,
                                    "custscript_l56_ajustinflacion_periodfin": periodFinSelected,
                                    "custscript_l56_ajustinflacion_cuentaajus": configAjusteInflacion.cuentaAjusteSelected,
                                    "custscript_l56_ajustinflacion_libroaju": configAjusteInflacion.libroAjusteSelected ,
                                    "custscript_l56_ajustinflacion_libroprinc": configAjusteInflacion.libroPrincipalSelected,
                                    "custscript_l56_ajustinflacion_subsidiary":configAjusteInflacion.subsidiarySelected,
                                    "custscript_l56_ajustinflacion_folder": configAjusteInflacion.folderSelected,
                                    "custscript_l56_ajustinflacion_email": email,
                                    "custscript_l56_ajustinflacion_genjour": checkGenerarJournal,
                                    "custscript_l56_ajustinflacion_jourauth": isUserContador,
                                    "custscript_l56_ajustinflacion_automa" : false
                                },
                                scriptId: "customscript_l56_ajuste_inflacion"
                            });
                            const taskMapId = mrTask.submit();
                            const taskStatus = task.checkStatus(taskMapId);
                            respuesta.estado = taskStatus;
                        } catch (error) {
                            respuesta.error = true;
                            respuesta.mensaje = `Excepción invocando al script programado - Excepción: ${error.message}`;
                            log.error(respuesta.mensaje);
                        }

                        log.debug(proceso, `406 - respuesta: ${JSON.stringify(respuesta)}`);
                    }
                }
            } catch (excepcion) {
                log.error({
                    title: proceso,
                    details: `Excepcion : ${excepcion.message}`
                });
            }

            log.debug({
                title: proceso,
                details: "FIN Dibujando SuiteLet"
            });
            context.response.writePage(form);
        }
        function getLogs(){
            try {
                let savedSearch = search.create({
                    type: "customrecord_l56_log_ajust_inf",
                    filters:
                    [
                       ["isinactive","is","F"]
                    ],
                    columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC
                         }),
                         search.createColumn({
                          name: "custrecord_l56_log_ajustinf_est",
                       }),
                       search.createColumn({
                          name: "custrecord_l56_log_ajustinf_det",
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "{custrecord_l56_log_ajusinf_per_ini} ||' - '|| {custrecord_l56_log_ajusinf_per_fin}"
                       }),
                       search.createColumn({
                          name: "custrecord_l56_log_ajusinf_jour",
                       }),
                       search.createColumn({
                          name: "custrecord_l56_log_ajusinf_report",
                       }),
                       search.createColumn({
                        name: "custrecord_l56_log_ajusinf_subsid",
                     }),


                    ]
                 });
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                completeResultSet= resultSearch.getRange({
                    start: 0,
                    end: 1000
                });
                let logsList = []
                for(let i = 0;i<completeResultSet.length;i++) {
                    let logId = completeResultSet[i].getValue({name: resultSearch.columns[0]});
                    let logEstado = completeResultSet[i].getValue({name: resultSearch.columns[1]});
                    let logPeriods = completeResultSet[i].getValue({name: resultSearch.columns[3]});
                    let logJournal = completeResultSet[i].getText({name: resultSearch.columns[4]});
                    let logReport = completeResultSet[i].getText({name: resultSearch.columns[5]});
                    let logSubsid = completeResultSet[i].getText({name: resultSearch.columns[6]});
                    let logUrl = url.resolveRecord({
                        recordType: 'customrecord_l56_log_ajust_inf',
                        recordId: logId,
                    });
                    logsList.push( { logEstado ,logPeriods,logJournal,logReport, logUrl,logSubsid, logId})
                }
                log.audit('logsList',logsList)
                return logsList
             
            } catch (excepcion) {
                log.error("getLogs - Error: ", excepcion.message.toString());
            }             
        }
        function getConfigAjusteInflacion(subsidId){   
            try {
                let savedSearch = search.create({
                    type: "customrecord_l54_config_ajust_inf",
                    filters:
                    [
                       ["isinactive","is","F"], 
                       "AND", 
                       ["custrecord_l54_config_ajusinf_subsid","is",subsidId]
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "internalid",
                       }),
                       search.createColumn({
                          name: "custrecord_l54_config_ajusinf_libajus",
                       }),
                       search.createColumn({
                        name: "custrecord_l54_config_ajusinf_libprin",
                       }),
                     search.createColumn({
                        name: "custrecord_l54_config_ajusinf_subsid",
                     }),
                     search.createColumn({
                        name: "custrecord_l54_config_ajusinf_cuenta",
                     }),
                     search.createColumn({
                        name: "custrecord_l54_config_ajusinf_folder",
                     }),
                     search.createColumn({
                        name: "custrecord_l54_config_ajusinf_rol_aut",
                     }),

                    ]
                 });
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                completeResultSet= resultSearch.getRange({
                    start: 0,
                    end: 1
                });
                if ( completeResultSet.length > 0) {
                    let libroAjusteSelected = completeResultSet[0].getValue({name: resultSearch.columns[1]});
                    let libroPrincipalSelected = completeResultSet[0].getValue({name: resultSearch.columns[2]});
                    let subsidiarySelected = completeResultSet[0].getValue({name: resultSearch.columns[3]});
                    let cuentaAjusteSelected = completeResultSet[0].getValue({name: resultSearch.columns[4]});
                    let folderSelected = completeResultSet[0].getValue({name: resultSearch.columns[5]});
                    let rolesAutorizados = completeResultSet[0].getValue({name: resultSearch.columns[6]});
                    return {libroAjusteSelected ,libroPrincipalSelected,subsidiarySelected,cuentaAjusteSelected,folderSelected,rolesAutorizados}
                }
             
                
            } catch (excepcion) {
                log.error("ejecutarAjusteInflacion - Error: ", excepcion.message.toString());
            }             
        } 
        return {
            onRequest: onRequest
        };
    });