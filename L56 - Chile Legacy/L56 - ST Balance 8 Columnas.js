/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget','L56/utilidades', 'N/runtime', 'N/search','N/file', 'N/render', 'N/record', 'N/format', 'N/config'],

  function (serverWidget, utilities, runtime, search, file, render, record, format, config) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
    */
    const FN = 'Generación Balance Tributario 8 Columnas',
          RPT = { error: false, mensaje: "", result: []};

    const onRequest = (context) => {
      let suitelet = context.request.parameters.suitelet;
      log.debug('suitelet',suitelet )
      if(suitelet == null){
          main(context)
      }else{
          report[suitelet](context)
      }
    } 

    const main = (context) => {
      try {
        
        var nameReport = runtime.getCurrentScript().getParameter({ name: 'custscript_l56_balance_8_columnas_title' });
   
        log.debug(FN, 'INICIO SuiteLet');

        let form = serverWidget.createForm(nameReport);
        form.clientScriptModulePath = './L56 - CL Balance 8 Columnas';

        form.addFieldGroup({
          id: 'custpage_filters',
          label: 'Filtros de Búsqueda'
        });

        form.addTab({
          id: 'custpage_tab',
          label: 'Detalle'
        });

        form.addSubtab({
          id: 'custpage_list',
          label: 'Lista de Resultados',
          tab: 'custpage_tab'
        });

        /** Campos */
        var resultados = form.addField({
          id: 'custpage_data',
          label: 'Datos:',
          type: serverWidget.FieldType.LONGTEXT,
          container: 'custpage_filters'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        form.addField({
          id: 'custpage_action',
          label: 'Accion:',
          type: serverWidget.FieldType.TEXT,
          container: 'custpage_filters'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        var OneWorld = runtime.isFeatureInEffect({
          feature: "SUBSIDIARIES"
        })

        log.debug("OneWorld",OneWorld)
        if(OneWorld == true || OneWorld == 'T'){
          var subsidiary = form.addField({
            id: 'custpage_subsidiary',
            label: 'Subsidiaria',
            type: serverWidget.FieldType.SELECT,
            source: 'subsidiary',
            container: 'custpage_filters'
          });
  
          subsidiary.isMandatory = true;
          subsidiary.defaultValue = context.request.parameters.custpage_subsidiary;
        }
        

        var periodFrom = form.addField({
          id: 'custpage_period_from',
          label: 'Desde:',
          type: serverWidget.FieldType.DATE,
          container: 'custpage_filters'
        });
        periodFrom.defaultValue = context.request.parameters.custpage_period_from;

        //addPeriods(periodFrom);

        var periodTo = form.addField({
          id: 'custpage_period_to',
          label: 'Hasta',
          type: serverWidget.FieldType.DATE,
          container: 'custpage_filters'
        });
        periodTo.defaultValue = context.request.parameters.custpage_period_to;

        //addPeriods(periodTo);
        if(OneWorld != true && OneWorld != 'T'){ 
          var information = form.addField({
            id: 'custpage_company_info',
            label: 'Company',
            type: serverWidget.FieldType.LONGTEXT,
            container: 'custpage_filters'
          }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN 
          });

          var company = {};
          var configCompany = config.load({
            type: config.Type.COMPANY_INFORMATION
          });
          company.companyname = configCompany.getText('companyname');
          company.taxidnum = configCompany.getText("employerid");
          company.legalname = configCompany.getText("legalname");
          company.mainaddress_text = configCompany.getText("mainaddress_text");
          information.defaultValue = JSON.stringify(company);
        }

        /** Campos Sublist*/
        var sublistResults = form.addSublist({
          id: 'custpage_list_results',
          type: serverWidget.SublistType.LIST,
          label: 'Listado de Resultados',
          tab: 'custpage_tab'
        });

        sublistResults.addField({
          id: 'custpage_list_results_account',
          label: 'Cuenta Contable',
          type: serverWidget.FieldType.TEXT
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_debito',
          label: 'Débito',
          type: serverWidget.FieldType.TEXT
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_credito',
          type: serverWidget.FieldType.TEXT,
          label: 'Crédito'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_deudor',
          type: serverWidget.FieldType.TEXT,
          label: 'Saldo Deudor'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_acreedor',
          type: serverWidget.FieldType.TEXT,
          label: 'Saldo Acreedor'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_activo',
          type: serverWidget.FieldType.TEXT,
          label: 'Balance Activo'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_pasivo',
          type: serverWidget.FieldType.TEXT,
          label: 'Balance Pasivo'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_perdida',
          type: serverWidget.FieldType.TEXT,
          label: 'Resultado Pérdida'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublistResults.addField({
          id: 'custpage_list_results_ganancia',
          type: serverWidget.FieldType.TEXT,
          label: 'Resultado Ganacia'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        });

        //DIBUJA BOTONES
        form.addSubmitButton({
          label: 'Consultar'
        });

        form.addButton({
          id: 'custpage_btnconsultar',
          label: 'Generar Excel',
          functionName: "generarExcel"
        });

        form.addButton({
          id: 'custpage_btnconsultar1',
          label: 'Generar PDF',
          functionName: "generarPDF"
        });
        //FIN BOTON

        //Visualizar resultados
        /*var infoResultado = form.addField({
          id: 'custpage_resultado',
          label: 'Resultados',
          type: serverWidget.FieldType.INLINEHTML
        });*/

        if (context.request.method === 'GET') {

          log.audit(FN, 'FIN Proceso GET');
          context.response.writePage(form);

        } else {
          //var accion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
          //log.debug(FN, 'POST accion: ' + accion);

          getResultsBalance(context.request.parameters.custpage_subsidiary, context.request.parameters.custpage_period_from, context.request.parameters.custpage_period_to);
          
          setlistResults(sublistResults, RPT.result, resultados);
          
        }
        context.response.writePage(form);
      } catch (e) {
        log.error(FN, 'Error en OnRequest - Error : ' + e.message);
      }


    }

    const report = () => {}

    report.pdf = function (context){
      var fechaActual = context.request.parameters.fechaActual,
          subsidiary  = context.request.parameters.subsidiary,
          periodFrom  = context.request.parameters.periodFrom,
          periodTo    = context.request.parameters.periodTo,
          rango       = context.request.parameters.rango; 
      
      var nameReport = runtime.getCurrentScript().getParameter({ name: 'custscript_l56_balance_8_columnas_file' });
      var OneWorld = runtime.isFeatureInEffect({
        feature: "SUBSIDIARIES"
      })
   
      log.debug('fechaActual',fechaActual);
      log.debug('subsidiary', subsidiary);
      log.debug('periodFrom', periodFrom);
      log.debug('periodTo', periodTo);
      log.debug('rango', rango);
      
      getResultsBalance(subsidiary, periodFrom, periodTo);
          
      var information = setResults(RPT.result);
      var foldeID     = callFolder();

      log.debug('information', information)
      
      nameReport = './' + nameReport;

      var layoutFile = file.load({ id: nameReport });
      var template = layoutFile.getContents();

      log.debug('template', template)

      var renderTemplate = render.create();

      renderTemplate.templateContent = template;
      
      renderTemplate.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "input",
        data: {
            data: JSON.stringify(information),
            fecha: fechaActual,
            rango: rango
        }
      });

      if(OneWorld == true || OneWorld == 'T'){
        renderTemplate.addRecord({
          templateName: 'subsidiary',
          record: record.load({
              type: 'subsidiary',
              id: subsidiary
          })
        });
      }
      
      var stringPDF = renderTemplate.renderAsString();

      var renderPDF = render.xmlToPdf({
          xmlString: stringPDF
      });
      renderPDF.name = 'Balance Tributario.pdf';
      renderPDF.folder = foldeID;
      var idFile = renderPDF.save();

      
      context.response.writeFile(renderPDF);
      return true;
    }

    function callFolder (){
      var folderSearch = search.load({
          id: 'customsearch_l56_search_folder'
      });
      var folderID
      let folderResult = folderSearch.run().getRange(0,1);
          if(folderResult.length != 0){
              // let columns = folderResult[0].columns;
              folderID = folderResult[0].getValue(folderSearch.columns[0]);
          }else{
            var objRecord = record.create({
              type: record.Type.FOLDER,
              isDynamic: true
            });
            objRecord.setValue({
                fieldId: 'name',
                value: 'Balance Tributario'
            });
            var folderID = objRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
          }
      
      return folderID;
  }

    function setResults(listResults) {
      var jsonTotals = {
        debito: 0,
        credito: 0,
        deudor: 0,
        acreedor: 0,
        activo: 0,
        pasivo: 0,
        perdida: 0,
        ganancia:0,
      }

      var jsonPerdidasGanacias = {
        debito: '',
        credito: '',
        deudor: '',
        acreedor: '',
        activo: '',
        pasivo: '',
        perdida: '',
        ganancia: '',
      }
      if (listResults.length != 0) {
        for (var list in listResults) {
          
          jsonTotals.debito = parseFloat(Math.abs(parseFloat(jsonTotals.debito, 10) + Math.abs(parseFloat(listResults[list].debito, 10))));
          jsonTotals.credito = parseFloat(Math.abs(parseFloat(jsonTotals.credito, 10) + Math.abs(parseFloat(listResults[list].credito, 10))));
          jsonTotals.deudor = parseFloat(Math.abs(parseFloat(jsonTotals.deudor, 10) + Math.abs(parseFloat(listResults[list].deudor, 10))));
          jsonTotals.acreedor = parseFloat(Math.abs(parseFloat(jsonTotals.acreedor, 10) + Math.abs(parseFloat(listResults[list].acreedor, 10))));
          jsonTotals.activo = parseFloat(Math.abs(parseFloat(jsonTotals.activo, 10) + Math.abs(parseFloat(listResults[list].activo, 10))));
          jsonTotals.pasivo = parseFloat(Math.abs(parseFloat(jsonTotals.pasivo, 10) + Math.abs(parseFloat(listResults[list].pasivo, 10))));
          jsonTotals.perdida = parseFloat(Math.abs(parseFloat(jsonTotals.perdida, 10) + Math.abs(parseFloat(listResults[list].perdida, 10))));
          jsonTotals.ganancia = parseFloat(Math.abs(parseFloat(jsonTotals.ganancia, 10) + Math.abs(parseFloat(listResults[list].ganancia, 10))));
        }
        let debitCredit = parseFloat(Math.abs(parseFloat(jsonTotals.debito, 10) - Math.abs(parseFloat(jsonTotals.credito, 10))));
        jsonPerdidasGanacias.debito = parseFloat(jsonTotals.debito, 10) < parseFloat(jsonTotals.credito, 10) ? debitCredit : '';
        jsonPerdidasGanacias.credito = parseFloat(jsonTotals.debito, 10) > parseFloat(jsonTotals.credito, 10) ? debitCredit : '';
  
        
        let deudorAcreedor = parseFloat(Math.abs(parseFloat(jsonTotals.deudor, 10) - Math.abs(parseFloat(jsonTotals.acreedor, 10))));
        jsonPerdidasGanacias.deudor = parseFloat(jsonTotals.deudor, 10) < parseFloat(jsonTotals.acreedor, 10) ? deudorAcreedor : '';
        jsonPerdidasGanacias.acreedor = parseFloat(jsonTotals.deudor, 10) > parseFloat(jsonTotals.acreedor, 10) ? deudorAcreedor : '';
  
        
        let activoPasivo = parseFloat(Math.abs(parseFloat(jsonTotals.activo, 10) - Math.abs(parseFloat(jsonTotals.pasivo, 10))));
        jsonPerdidasGanacias.activo = parseFloat(jsonTotals.activo, 10) < parseFloat(jsonTotals.pasivo, 10) ? activoPasivo : '';
        jsonPerdidasGanacias.pasivo = parseFloat(jsonTotals.activo, 10) > parseFloat(jsonTotals.pasivo, 10) ? activoPasivo : '';
  
        
        let perdidaGanancia = parseFloat(Math.abs(parseFloat(jsonTotals.perdida, 10) - Math.abs(parseFloat(jsonTotals.ganancia, 10))));
        jsonPerdidasGanacias.perdida = parseFloat(jsonTotals.perdida, 10) < parseFloat(jsonTotals.ganancia, 10) ? perdidaGanancia : '';
        jsonPerdidasGanacias.ganancia = parseFloat(jsonTotals.perdida, 10) > parseFloat(jsonTotals.ganancia, 10) ? perdidaGanancia : '';
  
        /** Listar Total Genera ->> Totales + Diferencia entre los totales */
        let totalDebito = utilities.isEmpty(jsonPerdidasGanacias.debito) ? jsonTotals.debito : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.debito, 10) + Math.abs(parseFloat(jsonTotals.debito, 10))))
        let totalCredito = utilities.isEmpty(jsonPerdidasGanacias.credito) ? jsonTotals.credito : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.credito, 10) + Math.abs(parseFloat(jsonTotals.credito, 10))))
        let totalDeudor = utilities.isEmpty(jsonPerdidasGanacias.deudor) ? jsonTotals.deudor : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.deudor, 10) + Math.abs(parseFloat(jsonTotals.deudor, 10))))
        let totalAcreedor = utilities.isEmpty(jsonPerdidasGanacias.acreedor) ? jsonTotals.acreedor : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.acreedor, 10) + Math.abs(parseFloat(jsonTotals.acreedor, 10))))
        let totalActivo = utilities.isEmpty(jsonPerdidasGanacias.activo) ? jsonTotals.activo : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.activo, 10) + Math.abs(parseFloat(jsonTotals.activo, 10))))
        let totalPasivo = utilities.isEmpty(jsonPerdidasGanacias.pasivo) ? jsonTotals.pasivo : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.pasivo, 10) + Math.abs(parseFloat(jsonTotals.pasivo, 10))))
        let totalPerdida = utilities.isEmpty(jsonPerdidasGanacias.perdida) ? jsonTotals.perdida : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.perdida, 10) + Math.abs(parseFloat(jsonTotals.perdida, 10))))
        let totalGanancia = utilities.isEmpty(jsonPerdidasGanacias.ganancia) ? jsonTotals.ganancia : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.ganancia, 10) + Math.abs(parseFloat(jsonTotals.ganancia, 10))))
        
        var jsonExcel={
          data: listResults,
          totals: jsonTotals,
          diferents: jsonPerdidasGanacias,
          result:{
            debito: totalCredito,
            credito: totalCredito,
            deudor: totalDeudor,
            acreedor: totalAcreedor,
            activo: totalActivo,
            pasivo: totalPasivo,
            perdida: totalPerdida,
            ganancia: totalGanancia,
          }
        }
      }
      return jsonExcel;

    }

    function setlistResults(sublist, listResults, campResult) {
      var jsonTotals = {
        debito: 0,
        credito: 0,
        deudor: 0,
        acreedor: 0,
        activo: 0,
        pasivo: 0,
        perdida: 0,
        ganancia:0,
      }

      var jsonPerdidasGanacias = {
        debito: '',
        credito: '',
        deudor: '',
        acreedor: '',
        activo: '',
        pasivo: '',
        perdida: '',
        ganancia: '',
      }
      if (listResults.length != 0) {
        var i = 0;
        for (var list in listResults) {
          setValueSubslit(sublist, 'custpage_list_results_account', i, listResults[list].account, false);
          setValueSubslit(sublist, 'custpage_list_results_debito', i, listResults[list].debito, false);
          setValueSubslit(sublist, 'custpage_list_results_credito', i, listResults[list].credito, false);
          setValueSubslit(sublist, 'custpage_list_results_deudor', i, listResults[list].deudor, false);
          setValueSubslit(sublist, 'custpage_list_results_acreedor', i, listResults[list].acreedor, false);
          setValueSubslit(sublist, 'custpage_list_results_activo', i, listResults[list].activo, false);
          setValueSubslit(sublist, 'custpage_list_results_pasivo', i, listResults[list].pasivo, false);
          setValueSubslit(sublist, 'custpage_list_results_perdida', i, listResults[list].perdida, false);
          setValueSubslit(sublist, 'custpage_list_results_ganancia', i, listResults[list].ganancia, false);
          
          i++;

          jsonTotals.debito = parseFloat(Math.abs(parseFloat(jsonTotals.debito, 10) + Math.abs(parseFloat(listResults[list].debito, 10))));
          jsonTotals.credito = parseFloat(Math.abs(parseFloat(jsonTotals.credito, 10) + Math.abs(parseFloat(listResults[list].credito, 10))));
          jsonTotals.deudor = parseFloat(Math.abs(parseFloat(jsonTotals.deudor, 10) + Math.abs(parseFloat(listResults[list].deudor, 10))));
          jsonTotals.acreedor = parseFloat(Math.abs(parseFloat(jsonTotals.acreedor, 10) + Math.abs(parseFloat(listResults[list].acreedor, 10))));
          jsonTotals.activo = parseFloat(Math.abs(parseFloat(jsonTotals.activo, 10) + Math.abs(parseFloat(listResults[list].activo, 10))));
          jsonTotals.pasivo = parseFloat(Math.abs(parseFloat(jsonTotals.pasivo, 10) + Math.abs(parseFloat(listResults[list].pasivo, 10))));
          jsonTotals.perdida = parseFloat(Math.abs(parseFloat(jsonTotals.perdida, 10) + Math.abs(parseFloat(listResults[list].perdida, 10))));
          jsonTotals.ganancia = parseFloat(Math.abs(parseFloat(jsonTotals.ganancia, 10) + Math.abs(parseFloat(listResults[list].ganancia, 10))));
        }
        let debitCredit = parseFloat(Math.abs(parseFloat(jsonTotals.debito, 10) - Math.abs(parseFloat(jsonTotals.credito, 10))));
        jsonPerdidasGanacias.debito = parseFloat(jsonTotals.debito, 10) < parseFloat(jsonTotals.credito, 10) ? debitCredit : '';
        jsonPerdidasGanacias.credito = parseFloat(jsonTotals.debito, 10) > parseFloat(jsonTotals.credito, 10) ? debitCredit : '';
  
        
        let deudorAcreedor = parseFloat(Math.abs(parseFloat(jsonTotals.deudor, 10) - Math.abs(parseFloat(jsonTotals.acreedor, 10))));
        jsonPerdidasGanacias.deudor = parseFloat(jsonTotals.deudor, 10) < parseFloat(jsonTotals.acreedor, 10) ? deudorAcreedor : '';
        jsonPerdidasGanacias.acreedor = parseFloat(jsonTotals.deudor, 10) > parseFloat(jsonTotals.acreedor, 10) ? deudorAcreedor : '';
  
        
        let activoPasivo = parseFloat(Math.abs(parseFloat(jsonTotals.activo, 10) - Math.abs(parseFloat(jsonTotals.pasivo, 10))));
        jsonPerdidasGanacias.activo = parseFloat(jsonTotals.activo, 10) < parseFloat(jsonTotals.pasivo, 10) ? activoPasivo : '';
        jsonPerdidasGanacias.pasivo = parseFloat(jsonTotals.activo, 10) > parseFloat(jsonTotals.pasivo, 10) ? activoPasivo : '';
  
        
        let perdidaGanancia = parseFloat(Math.abs(parseFloat(jsonTotals.perdida, 10) - Math.abs(parseFloat(jsonTotals.ganancia, 10))));
        jsonPerdidasGanacias.perdida = parseFloat(jsonTotals.perdida, 10) < parseFloat(jsonTotals.ganancia, 10) ? perdidaGanancia : '';
        jsonPerdidasGanacias.ganancia = parseFloat(jsonTotals.perdida, 10) > parseFloat(jsonTotals.ganancia, 10) ? perdidaGanancia : '';
  
        /** Listar Totales ->> Suma de todas las columnas */
        setValueSubslit(sublist, 'custpage_list_results_account', i, 'Sub Totales', true);
        setValueSubslit(sublist, 'custpage_list_results_debito', i, jsonTotals.debito, true);
        setValueSubslit(sublist, 'custpage_list_results_credito', i, jsonTotals.credito, true);
        setValueSubslit(sublist, 'custpage_list_results_deudor', i, jsonTotals.deudor, true);
        setValueSubslit(sublist, 'custpage_list_results_acreedor', i, jsonTotals.acreedor, true);
        setValueSubslit(sublist, 'custpage_list_results_activo', i, jsonTotals.activo, true);
        setValueSubslit(sublist, 'custpage_list_results_pasivo', i, jsonTotals.pasivo, true);
        setValueSubslit(sublist, 'custpage_list_results_perdida', i, jsonTotals.perdida, true);
        setValueSubslit(sublist, 'custpage_list_results_ganancia', i, jsonTotals.ganancia, true);
  
        i++;
  
        /** Listar Perdida / Ganancia ->> Diferencia entre los totales */
        
        setValueSubslit(sublist, 'custpage_list_results_account', i, 'Pérdida / Ganancia', true);
        setValueSubslit(sublist, 'custpage_list_results_debito', i, jsonPerdidasGanacias.debito, true);
        setValueSubslit(sublist, 'custpage_list_results_credito', i, jsonPerdidasGanacias.credito, true);
        setValueSubslit(sublist, 'custpage_list_results_deudor', i, jsonPerdidasGanacias.deudor, true);
        setValueSubslit(sublist, 'custpage_list_results_acreedor', i, jsonPerdidasGanacias.acreedor, true);
        setValueSubslit(sublist, 'custpage_list_results_activo', i, jsonPerdidasGanacias.activo, true);
        setValueSubslit(sublist, 'custpage_list_results_pasivo', i, jsonPerdidasGanacias.pasivo, true);
        setValueSubslit(sublist, 'custpage_list_results_perdida', i, jsonPerdidasGanacias.perdida, true);
        setValueSubslit(sublist, 'custpage_list_results_ganancia', i, jsonPerdidasGanacias.ganancia, true);
  
        i++;
  
        /** Listar Total Genera ->> Totales + Diferencia entre los totales */
        let totalDebito = utilities.isEmpty(jsonPerdidasGanacias.debito) ? jsonTotals.debito : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.debito, 10) + Math.abs(parseFloat(jsonTotals.debito, 10))))
        let totalCredito = utilities.isEmpty(jsonPerdidasGanacias.credito) ? jsonTotals.credito : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.credito, 10) + Math.abs(parseFloat(jsonTotals.credito, 10))))
        let totalDeudor = utilities.isEmpty(jsonPerdidasGanacias.deudor) ? jsonTotals.deudor : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.deudor, 10) + Math.abs(parseFloat(jsonTotals.deudor, 10))))
        let totalAcreedor = utilities.isEmpty(jsonPerdidasGanacias.acreedor) ? jsonTotals.acreedor : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.acreedor, 10) + Math.abs(parseFloat(jsonTotals.acreedor, 10))))
        let totalActivo = utilities.isEmpty(jsonPerdidasGanacias.activo) ? jsonTotals.activo : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.activo, 10) + Math.abs(parseFloat(jsonTotals.activo, 10))))
        let totalPasivo = utilities.isEmpty(jsonPerdidasGanacias.pasivo) ? jsonTotals.pasivo : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.pasivo, 10) + Math.abs(parseFloat(jsonTotals.pasivo, 10))))
        let totalPerdida = utilities.isEmpty(jsonPerdidasGanacias.perdida) ? jsonTotals.perdida : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.perdida, 10) + Math.abs(parseFloat(jsonTotals.perdida, 10))))
        let totalGanancia = utilities.isEmpty(jsonPerdidasGanacias.ganancia) ? jsonTotals.ganancia : parseFloat(Math.abs(parseFloat(jsonPerdidasGanacias.ganancia, 10) + Math.abs(parseFloat(jsonTotals.ganancia, 10))))
        
        setValueSubslit(sublist, 'custpage_list_results_account', i, 'Total General', true);
        setValueSubslit(sublist, 'custpage_list_results_debito', i, totalDebito, true);
        setValueSubslit(sublist, 'custpage_list_results_credito', i, totalCredito, true);
        setValueSubslit(sublist, 'custpage_list_results_deudor', i, totalDeudor, true);
        setValueSubslit(sublist, 'custpage_list_results_acreedor', i, totalAcreedor, true);
        setValueSubslit(sublist, 'custpage_list_results_activo', i, totalActivo, true);
        setValueSubslit(sublist, 'custpage_list_results_pasivo', i, totalPasivo, true);
        setValueSubslit(sublist, 'custpage_list_results_perdida', i, totalPerdida, true);
        setValueSubslit(sublist, 'custpage_list_results_ganancia', i, totalGanancia, true);
  
        i++;
  
        var jsonExcel={
          data: listResults,
          totals: jsonTotals,
          diferents: jsonPerdidasGanacias,
          result:{
            debito: totalCredito,
            credito: totalCredito,
            deudor: totalDeudor,
            acreedor: totalAcreedor,
            activo: totalActivo,
            pasivo: totalPasivo,
            perdida: totalPerdida,
            ganancia: totalGanancia,
          }
        }
        campResult.defaultValue = JSON.stringify(jsonExcel);
      }

    }


    function addPeriods(select_period){
      var search_period = search.create({
      type: 'accountingperiod',
      filters: [
          ['isquarter', 'is', 'F'], 'AND',
          ['isinactive', 'is', 'F']
      ],
      columns:
          [
            search.createColumn({ name: "internalid", summary: "GROUP", sort: search.Sort.DESC, label: "Internal ID" }),
            search.createColumn({ name: "periodname", summary: "GROUP", label: "Name" })
          ]
      });
      var results = search_period.run().getRange(0, 1000);
      var columns = search_period.columns;

      select_period.addSelectOption({
          value: ' ',
          text: ' '
      });

      if (results && results.length) {
          for (var i = 0; i < results.length; i++) {
              var id = results[i].getValue(columns[0]);
              var name = results[i].getValue(columns[1]);
              select_period.addSelectOption({
                  value: id,
                  text: name
              });
          }
      }
    }


    /**
     * @return {object}  return
     * @return {object}  return.monedas
     * @return {boolean} return.error   True on error
     * @return {string}  return.mensaje An error message if there is any
    */
    function getResultsBalance(paramSub, paramPeriodFrom, ParamPeriodTo) { 
           
      try {
        let filtros = [];
        /*var periodFrom = search.lookupFields({
          type: 'accountingperiod',
          id: paramPeriodFrom,
          columns: ["startdate"]
        });

        var periodTo = search.lookupFields({
          type: 'accountingperiod',
          id: ParamPeriodTo,
          columns: ["enddate"]
        });
*/
        if (!utilities.isEmpty(paramSub)) {
          var filtro1 = {};
          filtro1.name = "subsidiary";
          filtro1.operator = "ANYOF";
          filtro1.values = paramSub;
          filtros.push(filtro1);
        }

        if (!utilities.isEmpty(paramPeriodFrom)) {
            var filtro2 = {};
            filtro2.name = "trandate";
            filtro2.operator = "ONORAFTER";
            filtro2.values = paramPeriodFrom;
            filtros.push(filtro2);
        }

        if (!utilities.isEmpty(ParamPeriodTo)) {
          var filtro3 = {};
          filtro3.name = "trandate";
          filtro3.operator = "ONORBEFORE";
          filtro3.values = ParamPeriodTo;
          filtros.push(filtro3);
      }

        var objResultSet = utilities.searchSavedPro("customsearch_cl_balance_tributario", filtros);

        if (objResultSet.error) {
            log.error(FN, "Error en consulta de SS ***Script / L56 - Balance 8 Columnas");
            return RPT;
        }

        var resultSet = objResultSet.objRsponseFunction.result;
        var resultSearch = objResultSet.objRsponseFunction.search;

        if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
            for (var i = 0; i < resultSet.length; i++) {
              if(resultSet[i].getText({ name: resultSearch.columns[0]}) == resultSet[i].getValue({ name: resultSearch.columns[1]})){
                var campAccount = resultSet[i].getValue({ name: resultSearch.columns[1]});
              }else{
                var campAccount = resultSet[i].getValue({ name: resultSearch.columns[0]}) +  ' ' + resultSet[i].getValue({ name: resultSearch.columns[1]});
              }
                RPT.result.push({
                  account: campAccount,
                  debito: Math.round(resultSet[i].getValue({ name: resultSearch.columns[2]})),
                  credito: Math.round(resultSet[i].getValue({ name: resultSearch.columns[3]})),
                  deudor: Math.round(resultSet[i].getValue({ name: resultSearch.columns[4]})),
                  acreedor: Math.round(resultSet[i].getValue({ name: resultSearch.columns[5]})),
                  activo: Math.round(resultSet[i].getValue({ name: resultSearch.columns[6]})),
                  pasivo: Math.round(resultSet[i].getValue({ name: resultSearch.columns[7]})),
                  perdida: Math.round(resultSet[i].getValue({ name: resultSearch.columns[8]})),
                  ganancia: Math.round(resultSet[i].getValue({ name: resultSearch.columns[9]})), 
                })
            }
        } else {
          RPT.error = true;
          RPT.mensaje = "No se encontró ningún resultado de transaccion para los filtros ingresados ";
          log.error(FN, respuesta.mensaje);
        }

      } catch (err) {
        RPT.error = true;
        RPT.mensaje = err.message;
      }
      log.debug('Respuesta de la búsqueda', RPT)
    }

  
    function setValueSubslit(sublist, campID, line, campValue, blank) {
      if(blank) var newValue = '<b> ' + campValue + ' </b>';
      else var newValue = campValue;
      sublist.setSublistValue({
        id: campID,
        line: line,
        value: newValue
      });
    }

    return {
      onRequest: onRequest
    };
  });