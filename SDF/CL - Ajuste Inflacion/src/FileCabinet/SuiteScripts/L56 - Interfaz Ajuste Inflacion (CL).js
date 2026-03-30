/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NAmdConfig /SuiteScripts/L56 - configuration.json
 *@NModuleScope Public
 */

 define(["N/currentRecord", "N/search", "N/format","L56/utilidades"],
    function (currentRecord, search, format, utilities) {

      //Lista (sólo js)
      function pad(number, length) {
        let str = "" + number;
        while (str.length < length) {
          str = "0" + str;
        }
        return str;
      }
  
      function saveRecord() {
        const objRecord = currentRecord.get();
        const periodIniSelected = objRecord.getValue({
          fieldId: "custpage_field_pini"
        });
        const periodFinSelected = objRecord.getValue({
          fieldId: "custpage_field_pfin"
        });
        const subsidiarySelected = objRecord.getValue({
            fieldId: "custpage_subsidiaria"
        });
        let configAjusteInflacion = getConfigAjusteInflacion(subsidiarySelected)
        const checkGenerarJournal = objRecord.getValue({
            fieldId: "custpage_field_check_jour"
        });
        console.log('checkGenerarJournal',checkGenerarJournal)
        

        if(utilities.isEmpty(configAjusteInflacion)){
            alert("No existe configuración para la Subsidiaria seleccionada");
            return false;
        }
        if (utilities.isEmpty(periodIniSelected)) {
            alert("Falta Periodo Inicio");
            return false;
        }else if (utilities.isEmpty(periodFinSelected)) {
            alert("Falta Periodo Fin");
            return false;
        }else if (utilities.isEmpty(subsidiarySelected)) {
            alert("Falta Subsidiary");
            return false;
        }else if (periodIniSelected == periodFinSelected) {
            alert("No puede seleccionar el mismo periodo para el ajuste");
            return false;
        }

  
        let periodIniInfo =  search.lookupFields({
            type: "accountingperiod",
            id: periodIniSelected,
            columns: ["startdate","periodname"]
        });
        let dateIniFormatted = periodIniInfo.startdate;
        let periodIniName = periodIniInfo.periodname;

        let periodFinInfo =  search.lookupFields({
            type: "accountingperiod",
            id: periodFinSelected,
            columns: ["startdate","periodname"]
        });
        let dateFinFormatted = periodFinInfo.startdate;
        let periodFinName = periodFinInfo.periodname;

        const dateFinParsed = format.parse({
          value: dateFinFormatted,
          type: format.Type.DATE
        });
        const dateIniParsed = format.parse({
            value: dateIniFormatted,
            type: format.Type.DATE
          });
  
        if (comparacionFechas(dateIniParsed, dateFinParsed) == 1) {
            alert("El Periodo Fin debe ser superior al Periodo Inicio");
            return false;
        }
        if(checkGenerarJournal && isEjecutado(dateIniFormatted,dateFinFormatted,subsidiarySelected)){
            alert("Existe un solapamiento de intervalos de un proceso ya ejecutado para la subsidiaria seleccionada.");
            return false;
        }
        let periods = getPeriods(dateIniFormatted,dateFinFormatted);
        let peridosSinIndice = []
        console.log(periods.toString())
        console.log(peridosSinIndice.toString());
        if(peridosSinIndice.length>0){
            alert("No existen índices configurados para los periodos seleccionados");
            return false;
        }
        //return confirm("¿Desea continuar con la ejecución del Ajuste de Inflación?")
        return true;
    }

    function getPeriods(dateIniFormatted,dateFinFormatted){
        try{
            let savedSearch = search.create({
                type: "accountingperiod",
                filters:
                [
                   ["startdate","onorafter",dateIniFormatted ], 
                   "AND", 
                   ["startdate","onorbefore",dateFinFormatted], 
                   "AND", 
                   ["isyear","is","F"], 
                   "AND", 
                   ["isquarter","is","F"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      summary: "GROUP",
                      label: "Internal ID"
                   })
                ]
             });
            let resultSearch = savedSearch.run();
            let completeResultSet = [];
            let resultIndex = 0;
            let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            let resultado; // temporary variable used to store the result set
            do {
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });
                if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
   
                // increase pointer 
                resultIndex = resultIndex + resultStep;
   
            } while (!utilities.isEmpty(resultado) && resultado.length > 0)

            let periodsIds = [];
            for (var i = 0; i < completeResultSet.length; i++) {
                let periodId = completeResultSet[i].getValue({
                    name: completeResultSet[i].columns[0]
                });
                periodsIds.push(periodId)
            }
            return periodsIds
        } catch (excepcion) {
            log.error("getPeriods", "getPeriods - Excepcion : " + excepcion.message.toString());
            return null;
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
                    join: "custrecord_l54_config_ajusinf_per_fin",
                    name: "enddate",
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
                return {libroAjusteSelected ,libroPrincipalSelected,subsidiarySelected,cuentaAjusteSelected,folderSelected}
            }
         
            
        } catch (excepcion) {
            log.error("ejecutarAjusteInflacion - Error: ", excepcion.message.toString());
        }             
    } 
    function comparacionFechas(fechaInicio, fechaFin) {
        const fechaInicioNew = (fechaInicio.getFullYear() + pad(parseInt(fechaInicio.getMonth(), 10) + parseInt(1, 10), 2) + pad(parseInt(fechaInicio.getDate(), 10) + parseInt(1, 10), 2));
        const fechaHastaNew = (fechaFin.getFullYear() + pad(parseInt(fechaFin.getMonth(), 10) + parseInt(1, 10), 2) + pad(parseInt(fechaFin.getDate(), 10) + parseInt(1, 10), 2));
        return ((fechaInicioNew > fechaHastaNew) - (fechaInicioNew < fechaHastaNew));
    }
    function isEjecutado(periodIni, periodFin, subsidiary){
        try{
            let savedSearchLog = search.create({
                type: "customrecord_l56_log_ajust_inf",
                filters:
                [
                ["isinactive","is","F"], 
                "AND", 
                ["custrecord_l56_log_ajusinf_jour","noneof","@NONE@"],
                "AND",
                ["custrecord_l56_log_ajustinf_est","is","EXITOSO"],
                "AND",
                [
                    ["custrecord_l56_log_ajusinf_per_ini.startdate", "before", periodFin], 
                    "AND",
                    ["custrecord_l56_log_ajusinf_per_fin.startdate", "after", periodIni],
                ],
                "AND",
                ["custrecord_l56_log_ajusinf_subsid", "is", subsidiary],
                ],
                columns:
                [
                search.createColumn({
                    name: "internalid",
                    summary: "COUNT",
                }),
                
                ]
            });
            let resultSearch = savedSearchLog.run();
            completeResultSet  = resultSearch.getRange({
                start: 0,
                end: 1
            });
            let logExitosCount = completeResultSet[0].getValue({name: resultSearch.columns[0]});
            console.log('LOG: ' + {periodFin,logExitosCount})
            return (logExitosCount > 0);
        }catch(error){
            alert(error)
            return true
        }

    }


      return {
        saveRecord: saveRecord,
      };
    }); 