/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/L56 - configuration.json
 *@NModuleScope Public
*/

define(["N/log", "N/url", "N/file", "N/encode", "N/runtime", "N/ui/serverWidget", "N/redirect", "N/task", "N/search", "LIB - Search", "LIB - Form", "L56/utilidades"], function (log, url, file, encode, runtime, serverWidget, redirect, task, search, libSearch, libForm, utilities) {
    
    let { InitSearch } = libSearch;
        InitSearch = new InitSearch();

    const onRequest = (context) => {
        let suitelet = context.request.parameters.suitelet;
        log.debug("context.request.parameters",context.request.parameters )
        log.debug("suitelet",suitelet )
        if(suitelet == null){
            main(context)
        }else{
            report[suitelet](context)
        }
    }

    const main = (context) => {
        try {
            var method = context.request.method,
                FN = "main"; 

            let { UserInterface } = libForm;
            let userInterface = new UserInterface();
                userInterface.init();

            if (method == "GET") {
                let nameReport = "Ajuste por Inflación a Activo Fijo";

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./L56 - Inflación Activo Fijo (CL).js");

                let conteinerID_1 = "custpage_group_filters";
                    userInterface.addFieldGroup(conteinerID_1, "Filtros");

                let assetType = userInterface.addField("custpage_asset_type", serverWidget.FieldType.MULTISELECT, "Tipo Activo: ", conteinerID_1, "customrecord_ncfar_assettype");
                let subsidiary = userInterface.addField("custpage_subsidiary", serverWidget.FieldType.SELECT, "Subsidiaria: ", conteinerID_1, "subsidiary");
                let dateInit = userInterface.addField("custpage_period_init", serverWidget.FieldType.SELECT, "Periodo Desde: ", conteinerID_1, "accountingperiod");
                let dateEnd = userInterface.addField("custpage_period_end", serverWidget.FieldType.SELECT, "Periodo Hasta: ", conteinerID_1, "accountingperiod");
                let origen = userInterface.addField("custpage_origen", serverWidget.FieldType.TEXT, "Origen: ", conteinerID_1, null);
                    
                subsidiary.setMandatoryValue(true);
                dateInit.setMandatoryValue(true);
                dateEnd.setMandatoryValue(true);

                origen.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                origen.setDefaultValue("sl_principal");

                var suiteletUrl = url.resolveScript({
                    scriptId: "customscript_l56_inflation_asset_sl",
                    deploymentId: "customdeploy_l56_inflation_asset_sl",
                    params: { 
                        suitelet: 'excel'
                    }
                });

                log.debug("suiteletUrl", suiteletUrl)
                userInterface.addSubmitButton("Generar Ajuste por Inflación");
                userInterface.addButton("custpage_download_excel", "Generar Archivo",  "downloadExcel('" + suiteletUrl + "')");

                context.response.writePage(userInterface.FORM);
            } else{
                let objConfiguration = getConfiguration(context.request.parameters)

                let rangePeriod = getRangePeriod(context.request.parameters)
                log.debug("rangePeriod",JSON.stringify(rangePeriod));
                
                let mandatoryCamps = utilities.getConfCamposObligatorios(context.request.parameters.custpage_subsidiary,1);
                log.debug('mandatoryCamps',mandatoryCamps)
                
                mandatoryCamps = !utilities.isEmpty(mandatoryCamps.campos) && mandatoryCamps.campos.length != 0 ? mandatoryCamps.campos : null;
                
                let user = runtime.getCurrentUser().id;

                let jsonResult = {
                    configuration: objConfiguration,
                    init: context.request.parameters.custpage_period_init,
                    end: context.request.parameters.custpage_period_end,
                    //requiredFields: requiredFields,
                    rangePeriod: rangePeriod,
                    mandatoryCamps: mandatoryCamps,
                    user: user,
                    memo: "Ajuste por Inflación de " + rangePeriod[1].periodname + " a " + rangePeriod[rangePeriod.length - 1].periodname
                }

                submitMapReduceTask(jsonResult, context.request.parameters,"customscript_l56_inflation_asset_mr", "customdeploy_l56_inflation_asset_mr");
                redirect.toSuitelet({
                    scriptId: "customscript_l56_inflation_asset_sl",
                    deploymentId: "customdeploy_l56_inflation_asset_sl",
                    // parameters: {
                    //     "suitelet": null
                    // }
                });
            }
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    const report = () => {}

    report.excel = function (context){
        let objConfiguration = getConfiguration(context.request.parameters);

        const filtros = buildFilters(context.request.parameters, objConfiguration);
        let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
                
        let savedSearch = InitSearch.getResultSearchObj("customsearch_l56_fam_altdepreciation", filters, 1);
        log.debug("savedSearch", JSON.stringify(savedSearch));
        
        let rangePeriod = getRangePeriod(context.request.parameters)
        log.debug("rangePeriod",JSON.stringify(rangePeriod));

        const periods = rangePeriod.map(period => period.internalid);
        const claves = Object.keys(savedSearch);

        log.debug("periods", periods);
        log.debug("claves", claves);

        periods.pop();

        filters = [
            InitSearch.getFilter("custrecord_l56_audit_inflation_asset", null, "ANYOF", claves, null),
            InitSearch.getFilter("custrecord_l56_audit_inflation_date_ini", null, "ANYOF", periods, null)
        ]

        let history = InitSearch.getResultSearchObj("customsearch_l56_audit_inflation", filters, 0);
        log.debug("history", JSON.stringify(history));

        let xmlString = printStyleExcel();
  
        xmlString += '<Worksheet ss:Name="Ajuste por Inflación Activo Fijos">';
        xmlString += '<Table>';

        const headers = ["Activo", "Periodo Desde", "Periodo Hasta", "Costo Original", "Indice", "Costo Actualizado al Inicio", "Ajuste Sobre Costo", "Costo Actualizado", "Amortizacion Acumulada al Inicio", "Ajuste Sobre Amortizacion Acumulada", "Amortizacion Acumulada Actualizada", "Valor en Libros al Inicio", "Valor en Libros Actualizado", "Asiento Contable"];

        xmlString += '<Row ss:Index="2">';
        headers.forEach(header => {
            xmlString += `<Cell ss:StyleID="header"><Data ss:Type="String">${header}</Data></Cell>`;
        });
        xmlString += '</Row>';

        Object.keys(history).forEach(key => {
            let costoActualAcumulado = 0;
            log.debug("history[key]", JSON.stringify(history[key]))
            
            for (let i = 0; i < history[key].length; i++) {
                const col = history[key][i];
                log.debug("col", col)
                let amortizacion = parseFloat(Number(col.col_10) - Number(col.col_11),10);
                const tipo = typeof col === 'number' ? 'Number' : 'String';
                let costoActualInicial = costoActualAcumulado != 0 ? costoActualAcumulado : col.col_10; 
                let amortizacionAcumulada =  parseFloat(Number(amortizacion) + Number(col.col_12),10); 
                costoActualAcumulado = parseFloat(Number(costoActualInicial) + Number(col.col_7),10);
                let libroActualizado = parseFloat(Number(costoActualAcumulado) - Number(amortizacionAcumulada),10);
                xmlString += '<Row>';
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="String">${col.col_1}</Data></Cell>`; // Activo
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="String">${col.col_2}</Data></Cell>`; // Periodo Desde
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="String">${col.col_3}</Data></Cell>`; // Periodo Hasta
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${savedSearch[col.col_0][0].col_14}</Data></Cell>`; // Costo Original
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${col.col_8}</Data></Cell>`; // Indice
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${costoActualInicial}</Data></Cell>`; // Costo Actualizado al Inicio
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${col.col_7}</Data></Cell>`; // Ajuste Sobre Costo
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${costoActualAcumulado}</Data></Cell>`; // Costo Actualizado
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${amortizacion}</Data></Cell>`; // Amortizacion Acumulada al Inicio
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${col.col_12}</Data></Cell>`; // Ajuste Sobre Amortizacion Acumulada
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${amortizacionAcumulada}</Data></Cell>`; // Amortizacion Acumulada Actualizada
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${col.col_11}</Data></Cell>`; // Valor en Libros al Inicio
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="Number">${libroActualizado}</Data></Cell>`; // Valor en Libros Actualizado
                xmlString += `<Cell ss:StyleID="normal"><Data ss:Type="String">${col.col_9}</Data></Cell>`; // Asiento Contable
                xmlString += '</Row>';
            }
            
        });

        xmlString += '</Table></Worksheet></Workbook>';

        var encodeXml = encode.convert({
            string: xmlString,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
        });

        let fileExcel = file.create({
            name: 'ReporteInflacionActivoFijo' + new Date() + '.xls',
            fileType: file.Type.EXCEL,
            contents: encodeXml,
            folder: objConfiguration[0].custrecord_l54_config_ajusinf_folder
        })

        // let idFile = fileExcel.save();
        // return idFile;
        
        let idFile = fileExcel.save();
        log.debug("idFile", idFile)
        let aux = file.load({id: idFile})

        context.response.writeFile({
            file: aux,
            isInline: false
        });
    }

    const printStyleExcel = () => {
         let strExcel = '';
            strExcel += '<?xml version="1.0"?>';
            strExcel += '<?mso-application progid="Excel.Sheet"?>';
            strExcel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
            strExcel += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
            strExcel += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:html="http://www.w3.org/TR/REC-html40">';

            // ESTILOS
            strExcel += '<Styles>';

            // Encabezado: azul con texto blanco y bordes
            strExcel += '<Style ss:ID="header">';
            strExcel += '<Font ss:Bold="1" ss:Color="#FFFFFF"/>';
            strExcel += '<Interior ss:Color="#4F81BD" ss:Pattern="Solid"/>';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += '<Borders>';
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
            strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
            strExcel += '</Borders>';
            strExcel += '</Style>';

            // Fila normal
            strExcel += '<Style ss:ID="normal">';
            strExcel += '<Alignment ss:Vertical="Center"/>';
            strExcel += '<Interior ss:Color="#EAF1FB" ss:Pattern="Solid"/>';
            strExcel += '<Borders>';
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>';
            strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>';
            strExcel += '</Borders>';
            strExcel += '</Style>';

            strExcel += '</Styles>';
    
        return strExcel ;
    }

    const getConfiguration = (parameters) => {
        let filters = [["custrecord_l54_config_ajusinf_subsid", "anyof", parameters.custpage_subsidiary],
                        "AND",
                        ["isinactive", "onorbefore", "F"]
                    ];

        let columns = ["custrecord_l54_config_ajusinf_libajus","custrecord_l54_config_ajusinf_folder"]
        
        let array = InitSearch.getSearchCreated("customrecord_l54_config_ajust_inf", filters, columns)

        return array;
    }

    const buildFilters = (parameters, configuration) => {
        let filtros = [];
        if (!utilities.isEmpty(parameters.custpage_subsidiary)){
            filtros.push({
                name: "custrecord_altdepr_subsidiary",
                operator: "ANYOF",
                values: parameters.custpage_subsidiary
            });
        }
        
        if (!utilities.isEmpty(parameters.custpage_asset_type)){
            filtros.push({
                name: "custrecord_altdepr_assettype",
                operator: "ANYOF",
                values: parameters.custpage_asset_type
            });
        }
        
        if (!utilities.isEmpty(configuration) && configuration.length > 0 ){
            filtros.push({
                name: "custrecord_altdepr_accountingbook",
                operator: "ANYOF",
                values: configuration[0].custrecord_l54_config_ajusinf_libajus
            });
        }

        if (!utilities.isEmpty(parameters.custpage_period_end)){
            let periodEnd = InitSearch.getSearchLookField("accountingperiod", parameters.custpage_period_end, ["startdate"]);
            filtros.push({
                name: "custrecord_assetpurchasedate",
                join: "custrecord_altdeprasset",
                operator: "ONORBEFORE",
                values: periodEnd.startdate
            });
        }

        return filtros;
    };

    const getRangePeriod = (parameters) => {
        log.debug("parameters", JSON.stringify(parameters));
       
        let periodInit = InitSearch.getSearchLookField("accountingperiod", parameters.custpage_period_init, ["internalid","startdate"]);
        let periodEnd = InitSearch.getSearchLookField("accountingperiod", parameters.custpage_period_end, ["internalid","enddate"]);
    
        let filters = [['startdate', 'onorafter', periodInit.startdate],
                        "AND",
                        ['enddate', 'onorbefore', periodEnd.enddate],
                        "AND",
                        ['isadjust', 'is', 'F'], // Opcional: excluir periodos de ajuste
                        "AND",
                        ['isquarter', 'is', 'F'],
                        "AND",
                        ['isyear', 'is', 'F']
                    ];
                    
        let columns = ["internalid", 
                        "periodname", 
                        search.createColumn({
                            name: "startdate",
                            sort: search.Sort.ASC // Aquí defines el orden ascendente
                          }), 
                        "enddate"]
        
        let array = InitSearch.getSearchCreated("accountingperiod", filters, columns)

        //** Obtengo el periodo previo */
    
        filters = [['startdate', 'before', periodInit.startdate],
                    "AND",
                    ['isadjust', 'is', 'F'], // Opcional: excluir periodos de ajuste
                    "AND",
                    ['isquarter', 'is', 'F'],
                    "AND",
                    ['isyear', 'is', 'F']
                ];

        columns = ["internalid", 
                    "periodname", 
                    search.createColumn({
                        name: "startdate",
                        sort: search.Sort.DESC // Aquí defines el orden ascendente
                    }), 
                    "enddate"];

        
        let array2 = InitSearch.getSearchCreated("accountingperiod", filters, columns)
        
        array.unshift(array2[0]);
        
        return array;
     }

    const submitMapReduceTask = (input, parameters, script, deploy) => {
        let params = {
            custscript_l56_inflation_asset_mr_sub: parameters.custpage_subsidiary,
            custscript_l56_inflation_asset_mr_type: parameters.custpage_asset_type,
            custscript_l56_inflation_asset_mr_input: JSON.stringify(input)
        }

        log.debug("params:", JSON.stringify(params));

        let scriptTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: script,
            deploymentId: deploy,
            params
        });
        let scriptTaskId = scriptTask.submit();
    }

    return {
        onRequest
    }
})