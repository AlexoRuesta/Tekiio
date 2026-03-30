/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@NAmdConfig /SuiteScripts/L54 - configuration.json
 */
define(['N/file', 'N/runtime', 'N/email', 'N/encode', 'LIB - Search v2', 'L54/utilidades', 'N/record', 'N/render'],

    function (file, runtime, email, encode, libSearch, utilities, record, render) {

        const proceso = 'Inflación Activo Fijo (MR)';
        
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

                parameters.subsidiary = currScript.getParameter({ name: 'custscript_l54_inflation_asset_p_mr_sub'});
                parameters.assetType = currScript.getParameter({ name: 'custscript_l54_inflation_asset_p_mr_type'});
                parameters.input = JSON.parse(currScript.getParameter({ name: 'custscript_l54_inflation_asset_p_mr_inp'}));
                log.debug("parameters.assetType", parameters.assetType)
                parameters.assetType = parameters.assetType.split(',')

                log.audit(proceso, 'Parámetros recibidos: ' + JSON.stringify(parameters));
                return parameters;
            } catch (excepcion) {
                log.error('getParameters', 'INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message.toString());
                return null;
            }
        }

        const getInputData = () => {

            try {
                log.audit(proceso, 'GetInputData - INICIO');

                let parameters = getParameters();

                // let assetsExcludes= getAssetsExcludes(parameters.input.indexPeriods);
                // log.debug("assetsExcludes",assetsExcludes )
                    
                const filtros = buildFilters(parameters);
                let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
                
                const savedSearch = InitSearch.getSavedSearch('customsearch_l54_fam_altdepreciation', filters);
                
                return savedSearch;

            } catch (error) {
                log.error('GetInputData - Error', 'Error obteniendo la información del suitelet y/o busquedas:' + error);
            }
        }

        function map(context) {
            let objRta = { 'error': false, 'idClave': context.key, 'detalles_errores': [] };
            let mensaje = '';
            try {
                let parameters = getParameters(),
                    input = parameters.input,
                    saveObjJournal = null,
                    saveObjAudit = null,
                    saveObjRecord = null,
                    indexPeriods = input.indexPeriods,
                    indexCC = 1,
                    indexA = 1,
                    arrAudit =[];

                let result = JSON.parse(context.value);
                log.debug('result', JSON.stringify(result));

                if (!utilities.isEmpty(result)){
                    let costoOriginal = result.values['custrecord_altdepr_originalcost'];
                    let asset = result.values['custrecord_altdeprasset'];
                    let dateDepreciation = result.values['custrecord_altdeprstartdeprdate'];

                    let currentCost = result.values['custrecord_altdepr_currentcost'] || 0.00;
                    let assetLife = !utilities.isEmpty(result.values['custrecord_altdeprlifetime']) && result.values['custrecord_altdeprlifetime'] != '0' ? result.values['custrecord_altdeprlifetime'] : 1;
                    
                    let depreciationPeriod = !utilities.isEmpty(result.values['custrecord_altdeprcurrentage']) ? result.values['custrecord_altdeprcurrentage'] : 0;
                    let bookValue = result.values['custrecord_altdeprnbv'] || 0.00;
                    let cumulativeDepreciation = result.values['custrecord_altdeprcd'];
                    let purchasedate = result.values['custrecord_assetpurchasedate.CUSTRECORD_ALTDEPRASSET'];
                    let tipoDepreciacion = result.values['custrecord_altdepr_assettype'];
                    
                    log.debug('getComparePeriods(purchasedate,indexPeriods[0].startdate', getComparePeriods(purchasedate,indexPeriods[0].startdate, '<'));
                    if(getComparePeriods(purchasedate,indexPeriods[0].startdate, '<')){ // 01/01/2025 < 01/01/2025
                        indexCC = parameters.input.index;
                    }else{
                         for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i]; // feb 2025
                            if(getComparePeriods(purchasedate,current.startdate, '<')){ // 01/01/2025 < 28/02/2025
                                indexCC = parseFloat(parseFloat(indexPeriods[indexPeriods.length - 1].custrecord_l54_axi_indice_num, 10) / parseFloat(prev.custrecord_l54_axi_indice_num, 10), 10);
                                break;
                            }
                         }
                    }
                    log.debug('getComparePeriods(purchasedate,indexPeriods[0].startdate', getComparePeriods(dateDepreciation,indexPeriods[0].startdate, '<'));

                    if(getComparePeriods(dateDepreciation,indexPeriods[0].startdate, '<')){
                        indexA = parameters.input.index;
                    }else{
                        for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i];
                            if(!getComparePeriods(dateDepreciation,current.enddate, '>') && getComparePeriods(purchasedate,current.startdate, '<')){
                                indexA = parseFloat(parseFloat(indexPeriods[indexPeriods.length - 1].custrecord_l54_axi_indice_num, 10) / parseFloat(prev.custrecord_l54_axi_indice_num, 10), 10);
                                break;
                            }
                         }
                    }
                    
                    log.debug('indices', indexCC + ' ->> ' + indexA);
                    //Cuentas
                    let assetAccount = result.values['custrecord_altdepr_assetaccount'];
                    let depreciationAccount = result.values['custrecord_altdepr_depraccount'];
                    let auxiliarAccount = result.values['custrecord_l54_account_auxiliar'];

                    let newCurrentCost = parseFloat(parseFloat(currentCost, 10) * parseFloat(indexCC, 10), 10);
                    let oldCurrentCost = parseFloat(parseFloat(currentCost, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                    let newCumulativeDepreciation = parseFloat(parseFloat(newCurrentCost, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                    let newBookValue = parseFloat(newCurrentCost, 10) - parseFloat(newCumulativeDepreciation, 10);
                    let amount = parseFloat(newCurrentCost, 10) - parseFloat(currentCost, 10);
                    let amortization = parseFloat(newCumulativeDepreciation, 10) - parseFloat(oldCurrentCost, 10);
                        
                    log.debug('amortization', amortization)
                    if(getComparePeriods(dateDepreciation,purchasedate, '!=')){
                        let newCurrentCost_2 = parseFloat(parseFloat(currentCost, 10) * parseFloat(indexA, 10), 10);
                        let newCumulativeDepreciation_2 = parseFloat(parseFloat(newCurrentCost_2, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                        amortization = parseFloat(newCumulativeDepreciation_2, 10) - parseFloat(oldCurrentCost, 10);
                    }

                    log.debug('Importes',newCurrentCost + ' ->> ' + oldCurrentCost + ' ->> ' + newCumulativeDepreciation + ' ->> ' + newBookValue + ' ->> ' + amortization  )
                        

                    /** Ingresar la auditoria */
                    if (parseFloat(amount, 10) != 0 || parseFloat(amortization, 10) != 0){
                        let firstPeriod = true;

                        log.debug('indexPeriods.length', indexPeriods.length)
                        var currentCostAux = currentCost;
                        var bookValueAux = bookValue;
                        for (let i = 1; i < indexPeriods.length; i++) {
                            let prev = indexPeriods[i-1];
                            let current = indexPeriods[i];
                            let amortizationValue = !utilities.isEmpty(dateDepreciation) ? parseFloat(amortization, 10) : 0;
                            if((!getComparePeriods(dateDepreciation,current.enddate, '>') && !utilities.isEmpty(dateDepreciation)) || (getComparePeriods(purchasedate,current.startdate, '<') && !utilities.isEmpty(purchasedate)) ){
                                log.debug('prev', prev)
                                log.debug('current', current)
                                let indexCurrent = current.custrecord_l54_axi_indice_num;
                                let periodCurrent = current.custrecord_l54_axi_indice_mes;
    
    
                                var indexPrev = prev.custrecord_l54_axi_indice_num;
                                var periodPrev = prev.custrecord_l54_axi_indice_mes;
                                var valorPrev = (firstPeriod) ? currentCost : valorInicial;
    
                                let index = parseFloat(parseFloat(indexCurrent, 10) / parseFloat(indexPrev, 10), 10);
    
                                valorInicial = parseFloat(parseFloat(valorPrev, 10) * parseFloat(index, 10), 10);
                                let ajuste = parseFloat(valorInicial, 10) - parseFloat(valorPrev, 10);
    
                                // var objAudit = record.create({
                                //     type: 'customrecord_l54_audit_inflation',
                                //     isDynamic: true
                                // });

                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_asset', value: asset.value });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_date_ini', value: periodPrev });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_date_end', value: periodCurrent });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_index', value: index });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_journal', value: saveObjJournal });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_ca', value: currentCost });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_nbv', value: bookValue });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_va', value: valorInicial });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_a', value: ajuste });
                                // objAudit.setValue({ fieldId: 'custrecord_l54_audit_inflation_amort', value: amortizationValue });
        
                                // try {
                                //     saveObjAudit = objAudit.save();
                                //     log.debug(proceso, 'SE GENERO EL HISTORIAL AJUSTE POR INFLACION EXITOSAMENTE - ID: ' + saveObjAudit);
                                // }
                                // catch (e) {
                                //     log.error(proceso, 'ERROR GENERANDO EL HISTORIAL AJUSTE POR INFLACION - EXCEPTION DETALLES: ' + e.message);
                                //     objRta.error = true;
                                //     mensaje = 'ERROR GENERANDO EL HISTORIAL AJUSTE POR INFLACION - EXCEPTION DETALLES: ' + e.message;
                                //     objRta.detalles_errores.push(mensaje);
                                // }

                               let camp11 = parseFloat(Number(currentCostAux) - Number(bookValueAux), 10);

                                let newCurrentCostAux = parseFloat(parseFloat(currentCostAux, 10) * parseFloat(index, 10), 10);
                                let oldCurrentCostAux = parseFloat(parseFloat(currentCostAux, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                                let newCumulativeDepreciation2 = parseFloat(parseFloat(newCurrentCostAux, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                                let newBookValue2 = parseFloat(newCurrentCostAux, 10) - parseFloat(newCumulativeDepreciation2, 10);
                                let amortization2 = parseFloat(newCumulativeDepreciation2, 10) - parseFloat(oldCurrentCostAux, 10);
                                    
                                log.debug('amortization2 parte1', amortization2 + ' ->> ' + index)
                                if(getComparePeriods(dateDepreciation,purchasedate, '!=')){
                                    var indexAuxi = 1;
                                     if(getComparePeriods(dateDepreciation,indexPeriods[0].startdate, '<')){
                                            indexAuxi = parseFloat(parseFloat(current.custrecord_l54_axi_indice_num, 10) / parseFloat(prev.custrecord_l54_axi_indice_num, 10), 10);;
                                        }else{
                                            
                                            if(!getComparePeriods(dateDepreciation,current.enddate, '>') && getComparePeriods(purchasedate,current.startdate, '<')){
                                                indexAuxi = parseFloat(parseFloat(indexPeriods[indexPeriods.length - 1].custrecord_l54_axi_indice_num, 10) / parseFloat(prev.custrecord_l54_axi_indice_num, 10), 10);
                                            }
                                            
                                        }
                                    let newCurrentCost_22 = parseFloat(parseFloat(currentCostAux, 10) * parseFloat(indexAuxi, 10), 10);
                                    let newCumulativeDepreciation_22 = parseFloat(parseFloat(newCurrentCost_22, 10) * parseFloat(parseFloat(depreciationPeriod, 10) / parseFloat(assetLife, 10), 10), 10);
                                    amortization2 = parseFloat(newCumulativeDepreciation_22, 10) - parseFloat(oldCurrentCostAux, 10);
                                log.debug('amortization2 parte2', amortization2 + ' ->> ' + indexAuxi)
                                }
                                 let amortizationValue2 = !utilities.isEmpty(dateDepreciation) ? parseFloat(amortization2, 10) : 0;

log.debug('amortization2 parte2', amortizationValue2)
                                firstPeriod = false;
                                arrAudit.push({ // flag
                                    indexIni: prev.periodname,
                                    indexEnd: current.periodname,
                                    index: index,
                                    col_6: valorInicial.toFixed(2),
                                    col_7: ajuste.toFixed(2),
                                    camp11: camp11,
                                    col_8: index,
                                    col_10: currentCostAux,
                                    col_11: bookValueAux,
                                    newBookValue2:newBookValue2,
                                    col_12: amortizationValue2.toFixed(2)
                                })

                                
                                currentCostAux = newCurrentCostAux;
                                bookValueAux = newBookValue2;
                            }
                        }

                        /** Modificar Depreciación Alternativa  */
                        // var objRecord = record.load({ type: 'customrecord_ncfar_altdepreciation', id: result.id });
                        
                        // objRecord.setValue({ fieldId: 'custrecord_altdepr_currentcost', value: newCurrentCost });
                        // objRecord.setValue({ fieldId: 'custrecord_altdeprnbv', value: newBookValue });

                        // try {
                        //     saveObjRecord = objRecord.save();
                        //     log.debug(proceso, 'SE MODIFICO LA DEPRECIACION ALTERNATIVA EXITOSAMENTE - ID: ' + saveObjRecord);
                        // }
                        // catch (e) {
                        //     log.error(proceso, 'ERROR MODIFICANDO LA DEPRECIACION ALTERNATIVA - EXCEPTION DETALLES: ' + e.message);
                        //     objRta.error = true;
                        //     mensaje = 'ERROR MODIFICANDO LA DEPRECIACION ALTERNATIVA - EXCEPTION DETALLES: ' + e.message;
                        //     objRta.detalles_errores.push(mensaje);
                        // }
                    }
                    if(arrAudit.length != 0){
                        context.write(result.id, JSON.stringify({
                            id: result.id,
                            asset: asset.text,
                            costoOriginal: costoOriginal,
                            currentCost: currentCost,
                            newCurrentCost: newCurrentCost.toFixed(2),
                            cumulativeDepreciation:cleanData(cumulativeDepreciation),
                            amount: amount.toFixed(2),
                            amortization: amortization.toFixed(2),
                            bookValue: bookValue,
                            newBookValue: newBookValue.toFixed(2),
                            assetAccount: assetAccount.text,
                            auxiliarAccount: auxiliarAccount.text,
                            depreciationAccount: depreciationAccount.text,
                            arrAudit: arrAudit,
                            tipoDepreciacion: tipoDepreciacion.text
                        }));
                    }
                    
                }
            } catch (e) {
                log.error(proceso, 'OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: ' + e.message);
                objRta.error = true;
                mensaje = 'OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: ' + e.message;
                objRta.detalles_errores.push(mensaje);
                context.write(result.id, objRta);
            }
        }

         function summarize(summary) {
            try {
                const parameters = getParameters();
                const proceso = 'Inflación Activo Fijo (MR)';

                let arrayResults = [];
                let lines = 0;
                let FOLDER_ID = getFolder();
                const accountId = runtime.accountId; // Para crear link directo a la carpeta

                const folderLink =
                    `https://${accountId}.app.netsuite.com/app/common/media/mediaitemfolders.nl?folder=${FOLDER_ID}`;
                // 🔹 Leer los datos generados en el MAP
                summary.output.iterator().each(function (key, value) {
                    log.debug("value", value)
                    let row = JSON.parse(value);
                    log.debug("row", row)
                    arrayResults.push(row);
                    log.debug("arrayResults", arrayResults)
                    return true;
                });

                log.audit(proceso, 'Total registros procesados: ' + arrayResults.length);

                if (arrayResults.length === 0) {
                    log.audit("SUMMARIZE", "No se generaron datos en el MAP. Proceso finalizado.");
                    
                    email.send({
                        author: parameters.input.user,
                        recipients: parameters.input.user,
                        subject: 'Informe proyectado de Ajuste por Inflación a Activo Fijo',
                        body: 'No se encontraron datos con los parametros seleccionados.'
                    });
                    return; // ← corta summarize()
                }

                let assetTypes = getAssetsTypes(parameters.assetType)
                
                let legalname = InitSearch.getSearchLookField(
                    "subsidiary",
                    parameters.subsidiary,
                    ["legalname"]
                ).legalname;

                /** Generando el EXCEL */
                const headers = [
                    "Activo",
                    "Costo Original",
                    "Costo Actualizado al Inicio",
                    "Ajuste Sobre Costo",
                    "Costo Actualizado",
                    "Amortización Acumulada",
                    "Ajuste Sobre Armotizacion Acumulada",
                    "Amortización Acumulada Actualizada",
                    "Valor Libros al Inicio",
                    "Valor Libros Actualizada",
                    "Cuenta Activo",
                    "Cuenta Auxiliar",
                    "Cuenta Depreciacion",
                    "Monto del Activo Ajustado",
                    "Amortizacion Ajustada",
                    "Periodo Desde",
                    "Periodo Hasta",
                    "Indice"
                ];

                /** Generación de Excel */

                const xmlEscape = (v) => {
                    if (v === null || v === undefined) return '';
                    return String(v)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');
                };

                // 🔹 Armar contenido XML (Excel Spreadsheet 2003 compatible)
                let xmlHeader = xmlHeaderExcel2 = `<?xml version="1.0" encoding="UTF-8"?>
                    <?mso-application progid="Excel.Sheet"?>
                    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                    xmlns:o="urn:schemas-microsoft-com:office:office"
                    xmlns:x="urn:schemas-microsoft-com:office:excel"
                    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                    xmlns:html="http://www.w3.org/TR/REC-html40">
                    <Styles>
                        <Style ss:ID="s21">
                            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                            <Font ss:Bold="1" ss:Color="#FFFFFF"/>
                            <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
                            <Borders>
                                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            </Borders>
                        </Style>

                        <Style ss:ID="s22">
                            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                            <Borders>
                                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            </Borders>
                            <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
                            <NumberFormat ss:Format="0.00"/>
                        </Style>

                        <Style ss:ID="s23">
                            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                            <Font ss:Bold="1" ss:Size="16"/>
                        </Style>

                        <Style ss:ID="s24">
                            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                            <Font ss:Bold="1" ss:Size="11"/>
                        </Style>
                        <Style ss:ID="Decimal14">
                            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                            <Borders>
                                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            </Borders>
                            <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
                            <NumberFormat ss:Format="0.0000000000000000"/>
                        </Style>
                    </Styles>

                    <Worksheet ss:Name="AjusteInflacion">
                    <Table>`;

                xmlHeader += `
                    <Row>
                    <Cell ss:MergeAcross="18" ss:StyleID="s23">
                        <Data ss:Type="String">Informe Proyectado de Ajuste por Inflación a Activo Fijo</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="18" ss:StyleID="s24">
                        <Data ss:Type="String">Activos Seleccionados: ${xmlEscape(assetTypes || "")}</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="18" ss:StyleID="s24">
                        <Data ss:Type="String">Subsidiaria: ${xmlEscape(legalname || "")}</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="18" ss:StyleID="s24">
                        <Data ss:Type="String">${xmlEscape(parameters.input.memo || "")}</Data>
                    </Cell>
                    </Row>
                    <Row/> 
                    `;

                xmlHeader += '<Row>' +
                headers
                    .map(header => `<Cell ss:StyleID="s21"><Data ss:Type="String">${header}</Data></Cell>`)
                    .join('') +
                '</Row>';

                // 🔹 Filas de datos
                arrayResults.forEach(r => {
                    const arr = Array.isArray(r.arrAudit) ? r.arrAudit : [];
                    const merge = arr.length > 0 ? arr.length - 1 : 0;
                    lines = lines + r.arrAudit.length;
                    xmlHeader += '<Row>';
                    const mergedCell = (val, type="String", style="s22") =>
                    `<Cell ss:MergeDown="${merge}" ss:StyleID="${style}"><Data ss:Type="${type}">${xmlEscape(val)}</Data></Cell>`;
                    let depre = parseFloat(r.newCurrentCost, 10) - parseFloat(r.newBookValue, 10);
                    let ajusteSobreCosto = parseFloat(r.newCurrentCost, 10) - parseFloat(r.currentCost, 10);
                    xmlHeader += mergedCell(r.asset); //Activo
                    xmlHeader += mergedCell(r.costoOriginal, "Number"); // Costo Original
                    xmlHeader += mergedCell(r.currentCost, "Number"); // Costo Actualizado al Inicio
                    xmlHeader += mergedCell(ajusteSobreCosto, "Number"); // Ajuste Sobre Costo
                    xmlHeader += mergedCell(r.newCurrentCost, "Number"); // Costo Actualizado
                    xmlHeader += mergedCell(r.cumulativeDepreciation, "Number"); // Amortización Acumulada
                    xmlHeader += mergedCell(r.amortization, "Number"); // Ajuste Sobre Armotizacion Acumulada
                    xmlHeader += mergedCell(depre, "Number"); // Amortización Acumulada Actualizada
                    xmlHeader += mergedCell(r.bookValue, "Number"); // Valor Libros al Inicio
                    xmlHeader += mergedCell(r.newBookValue, "Number"); // Valor Libros Actualizada
                    xmlHeader += mergedCell(r.assetAccount); // Cuenta Activo
                    xmlHeader += mergedCell(r.auxiliarAccount); // Cuenta Auxiliar
                    xmlHeader += mergedCell(r.depreciationAccount); // Cuenta Depreciacion
                    xmlHeader += mergedCell(r.amount, "Number"); // Monto
                    xmlHeader += mergedCell(r.amortization, "Number"); // Amortizacion
                    
                    

                    if (arr.length > 0) {
                        xmlHeader += `<Cell ss:StyleID="s22"><Data ss:Type="String">${xmlEscape(arr[0].indexIni)}</Data></Cell>`;
                        xmlHeader += `<Cell ss:StyleID="s22"><Data ss:Type="String">${xmlEscape(arr[0].indexEnd)}</Data></Cell>`;
                        xmlHeader += `<Cell ss:StyleID="s22"><Data ss:Type="String">${arr[0].index}</Data></Cell>`;
                    } else {
                        xmlHeader += `<Cell/><Cell/><Cell/>`;
                    }
                    xmlHeader += '</Row>';

                    for (let i = 1; i < arr.length; i++) {
                        xmlHeader += `<Row>
                            <Cell ss:StyleID="s22" ss:Index="16"><Data ss:Type="String">${xmlEscape(arr[i].indexIni)}</Data></Cell>
                            <Cell ss:StyleID="s22" ss:Index="17"><Data ss:Type="String">${xmlEscape(arr[i].indexEnd)}</Data></Cell>
                            <Cell ss:StyleID="s22" ss:Index="18"><Data ss:Type="String">${arr[i].index}</Data></Cell>
                        </Row>`;
                    }
                });

                // 🔹 Cierre del XML
                xmlHeader += '</Table></Worksheet></Workbook>';

                // 🔹 Convertir XML a Base64 usando módulo nativo
                const xmlBase64 = encode.convert({
                    string: xmlHeader,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });

                const fileObj = file.create({
                    name: 'ProyeccionActivoFijo_' + new Date() + '.xls',
                    fileType: file.Type.EXCEL,
                    contents: xmlBase64,
                    folder: FOLDER_ID, // ⚙️ reemplazá con tu carpeta destino
                    isOnline: true
                });

                const fileExcel = fileObj.save();
                log.audit(proceso, 'Archivo Excel generado con ID: ' + fileExcel);
                
                /** Generando el PDF */
                const headersPDF = [
                    "Activo",
                    "Costo<br/>Original",
                    "Costo Actualizado<br/>al Inicio",
                    "Ajuste Sobre<br/>Costo",
                    "Costo<br/>Actualizado",
                    "Amortización<br/>Acumulada",
                    "Ajuste Sobre<br/>Armotizacion Acumulada",
                    "Amortización<br/>Acumulada Actualizada",
                    "Valor Libros<br/>al Inicio",
                    "Valor Libros<br/>Actualizada"
                ];

                const headersPDFAsiento = [
                    "Cuenta Activo",
                    "Cuenta Auxiliar",
                    "Cuenta Depreciacion",
                    "Monto del Activo Ajustado",
                    "Amortizacion Ajustada"
                ];

                const subHeadersPDF = [
                    "Periodo Inicio",
                    "Periodo Cierre",
                    "Indice"
                ];

                let encabezadosHTML =
                '<p align="center"><font size="16"><b>' +
                'Informe Proyectado de Ajuste por Inflación a Activo Fijo' +
                '</b></font></p>' +

                '<p align="center"><font size="16"><b>' +
                'Activos seleccionados: ' + assetTypes +
                '</b></font></p>' +

                '<p align="center"><font size="16"><b>' +
                'Subsidiaria: ' + legalname +
                '</b></font></p>' +

                '<p align="center"><font size="16"><b>' +
                (parameters.input.memo || "") +
                '</b></font></p>'+  
                '<br/>';
                
                let colTitles = '<tr>' + headersPDF.map(c =>
                    '<td align="center"><b>' + c + '</b></td>'
                ).join('') + '</tr>';

                let subColTitles = '<tr>' + subHeadersPDF.map(c =>
                    '<td align="center"><b>' + xmlEscape(c) + '</b></td>'
                ).join('') + '</tr>';

                 let asientoCols = '<tr>' + headersPDFAsiento.map(c =>
                    '<td align="center"><b>' + xmlEscape(c) + '</b></td>'
                ).join('') + '</tr>';

                let pagesHtml = '';

                for (let i = 0; i < arrayResults.length; i++) {
                    let r = arrayResults[i];
                    const arr = r.arrAudit || [];
                    let depre = (parseFloat(r.newCurrentCost) - parseFloat(r.newBookValue)).toFixed(2);
                    let ajusteSobreCosto = (parseFloat(r.newCurrentCost, 10) - parseFloat(r.currentCost, 10)).toFixed(2);
                    let pdfRows = '';
                    let pdfRowsAudit = '';
                    let pdfRowsAsiento = '';
                    pdfRows += `
                        <tr>
                            <td align="center">${r.asset}</td>
                            <td align="center">${r.costoOriginal}</td>
                            <td align="center">${r.currentCost}</td>
                            <td align="center">${ajusteSobreCosto}</td>
                            <td align="center">${r.newCurrentCost}</td>
                            <td align="center">${r.cumulativeDepreciation}</td>
                            <td align="center">${r.amortization}</td>
                            <td align="center">${depre}</td>
                            <td align="center">${cleanData(r.bookValue)}</td>
                            <td align="center">${r.newBookValue}</td>
                            
                        </tr>
                    `;

                    for (let l = 0; l < arr.length; l++) {
                        const element = arr[l];
                        pdfRowsAudit += `
                            <tr>
                                <td align="center">${element.indexIni}</td>
                                <td align="center">${element.indexEnd}</td>
                                <td align="center">${element.index}</td>
                            </tr>
                        `;
                    }

                    pdfRowsAsiento += `
                            <tr>
                                <td>${r.assetAccount}</td>
                                <td>${r.auxiliarAccount}</td>
                                <td>${r.depreciationAccount}</td>
                                <td align="center">${r.amount}</td>
                                <td align="center">${r.amortization}</td>
                            </tr>
                        `;
                    if (i > 0 || i > 0) pagesHtml += '<pbr/>';

                    // --- Construcción completa de la hoja ---
                    pagesHtml +=
                        '<page size="A4-landscape" margin="0.5in">' +
                        encabezadosHTML +
                        '<table border="1" width="100%" cellpadding="3" cellspacing="0">' +
                        colTitles + pdfRows +
                        '</table>' +
                        '<br/>' +
                        '<p align="center"><font size="16"><b>' +
                        'Información del Asiento' +
                        '</b></font></p>' +
                        '<table border="1" width="100%" cellpadding="3" cellspacing="0">' +
                        asientoCols + pdfRowsAsiento +
                        '</table>' +
                        '<br/>' +
                        '<p align="center"><font size="16"><b>' +
                        'Historial Ajuste por Inflación' +
                        '</b></font></p>' +
                        '<table border="1" width="100%" cellpadding="3" cellspacing="0">' +
                        subColTitles + pdfRowsAudit +
                        '</table>' +
                        '</page>';
                    
                }

                const pdfXml =
                '<?xml version="1.0" encoding="UTF-8"?>' +
                '<pdf>' +
                '  <head>' +
                '    <macrolist>' +
                '      <macro id="footer">' +
                '        <p align="center"><font size="8">Página <pagenumber/> de <totalpages/></font></p>' +
                '      </macro>' +
                '    </macrolist>' +
                '  </head>' +
                '  <body footer="footer" font-size="9" size="A4-landscape">' +
                    pagesHtml +
                '  </body>' +
                '</pdf>';
                
                const pdfFile = render.xmlToPdf({ xmlString: pdfXml });
                pdfFile.name = 'ProyeccionActivoFijo_' + new Date() + '.pdf';
                pdfFile.folder = FOLDER_ID;
                pdfFile.isOnline = true;

                const pdfId = pdfFile.save();

                log.audit(proceso, 'PDF generado con ID: ' + pdfId);

                 /** Generando el EXCEL2 */
                const headersExcel2 = ["Activo", "Tipo de Activo", "Periodo Desde", "Periodo Hasta", "Costo Original", "Indice", "Costo Actualizado al Inicio", "Ajuste Sobre Costo", "Costo Actualizado", "Amortizacion Acumulada al Inicio", "Ajuste Sobre Amortizacion Acumulada", "Amortizacion Acumulada Actualizada", "Valor en Libros al Inicio", "Valor en Libros Actualizado"];

                xmlHeaderExcel2 += `
                    <Row>
                    <Cell ss:MergeAcross="12" ss:StyleID="s23">
                        <Data ss:Type="String">Informe Proyectado de Ajuste por Inflación a Activo Fijo</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="12" ss:StyleID="s24">
                        <Data ss:Type="String">Activos Seleccionados: ${xmlEscape(assetTypes || "")}</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="12" ss:StyleID="s24">
                        <Data ss:Type="String">Subsidiaria: ${xmlEscape(legalname || "")}</Data>
                    </Cell>
                    </Row>
                    <Row>
                    <Cell ss:MergeAcross="12" ss:StyleID="s24">
                        <Data ss:Type="String">${xmlEscape(parameters.input.memo || "")}</Data>
                    </Cell>
                    </Row>
                    <Row/> 
                    `;

                xmlHeaderExcel2 += '<Row>' +
                headersExcel2
                    .map(header => `<Cell ss:StyleID="s21"><Data ss:Type="String">${header}</Data></Cell>`)
                    .join('') +
                '</Row>';
                const mergedCell = (val, type="String", style="s22") =>
                    `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${xmlEscape(val)}</Data></Cell>`;
                 const mergedCell16 = (val, type="String", style="s22") =>
                    `<Cell ss:StyleID="Decimal14"><Data ss:Type="${type}">${xmlEscape(val)}</Data></Cell>`;

                let pos = 0;          // posición actual en arrayResults
                let parte = 1;        // contador de archivos
                var arrExcelf = [];
                while (pos < arrayResults.length) {

                    let cont = 0;
                    let xmlHeaderExcelN = xmlHeaderExcel2;  // tu cabecera original
                    // aquí xmlHeaderExcel2 tiene cabeceras, estilos, worksheet, table, etc.

                    // --- recorremos desde la posición guardada ---
                    for (let rIndex = pos; rIndex < arrayResults.length; rIndex++) {

                        const r = arrayResults[rIndex];
                        const arr = Array.isArray(r.arrAudit) ? r.arrAudit : [];
                        let costoActualAcumulado = 0;

                        for (let i = 0; i < arr.length; i++) {

                            const col = arr[i];

                            let amortizacion = parseFloat(Number(col.col_10) - Number(col.col_11), 10); //flag
                            let costoActualInicial = costoActualAcumulado != 0 ? costoActualAcumulado : col.col_10;
                            let amortizacionAcumulada = parseFloat(Number(col.camp11) + Number(col.col_12), 10);
                            costoActualAcumulado = parseFloat(Number(costoActualInicial) + Number(col.col_7), 10);
                            let libroActualizado = parseFloat(Number(costoActualAcumulado) - Number(amortizacionAcumulada), 10);

                            xmlHeaderExcelN += '<Row>';
                            xmlHeaderExcelN += mergedCell(r.asset);
                            xmlHeaderExcelN += mergedCell(r.tipoDepreciacion);
                            xmlHeaderExcelN += mergedCell(col.indexIni);
                            xmlHeaderExcelN += mergedCell(col.indexEnd);
                            xmlHeaderExcelN += mergedCell(r.costoOriginal, "Number"); // Costo Original
                            xmlHeaderExcelN += mergedCell(col.col_8); // Indice
                            xmlHeaderExcelN += mergedCell(costoActualInicial, "Number"); // Costo Actualizado al Inicio
                            xmlHeaderExcelN += mergedCell(col.col_7, "Number");  // Ajuste Sobre Costo
                            xmlHeaderExcelN += mergedCell(costoActualAcumulado, "Number"); // Costo Actualizado
                            xmlHeaderExcelN += mergedCell(col.camp11, "Number"); // Amortizacion Acumulada al Inicio
                            xmlHeaderExcelN += mergedCell(col.col_12, "Number"); // Ajuste Sobre Amortizacion Acumulada
                            xmlHeaderExcelN += mergedCell(amortizacionAcumulada, "Number"); // Amortizacion Acumulada Actualizada
                            xmlHeaderExcelN += mergedCell(col.col_11, "Number"); // Valor en Libros al Inicio
                            xmlHeaderExcelN += mergedCell(col.newBookValue2, "Number"); // Valor en Libros Actualizado
                            xmlHeaderExcelN += '</Row>';

                            cont++;

                            if (cont >= 450) break;
                        }

                        if (cont >= 450) {
                            pos = rIndex + 1; // guardamos dónde quedamos para el próximo archivo
                            break;
                        }

                        // si terminamos sin alcanzar 450, avanzamos al siguiente índice normalmente
                        pos = rIndex + 1;
                    }

                    // cerrar Excel
                    xmlHeaderExcelN += '</Table></Worksheet></Workbook>';

                    // convertir a base64
                    const xmlBase64Excel2 = encode.convert({
                        string: xmlHeaderExcelN,
                        inputEncoding: encode.Encoding.UTF_8,
                        outputEncoding: encode.Encoding.BASE_64
                    });

                    // GUARDAMOS EL ARCHIVO
                    const fileObjExcel2 = file.create({
                        name: 'ProyeccionReporteInflacionActivoFijo_' + new Date() + '_Parte' + parte + '.xls',
                        fileType: file.Type.EXCEL,
                        contents: xmlBase64Excel2,
                        folder: FOLDER_ID,
                        isOnline: true
                    });

                    const fileExcel2 = fileObjExcel2.save();
                    log.debug("fileExcel2", fileExcel2)
                    arrExcelf.push(fileObjExcel2)
                    parte++;   // siguiente archivo
                }

                // 🔹 Enviar el archivo por correo
                const author = parameters.input.user;
                const recipients = parameters.input.user;

                function addAttachmentIfPossible(id, attachments) {
                    const loaded = file.load({ id: id });
                    const size = loaded.size;
                    const totalSize = attachments.reduce((s, f) => s + f.size, 0);

                    if (totalSize + size > 15 * 1024 * 1024) {
                        log.error("EMAIL", `Archivo omitido por exceso de 15MB: ${loaded.name}`);
                        return false;
                    }

                    attachments.push(loaded);
                    return true;
                }

                let body = 'Adjunto archivo con los resultados del proceso.';

                if (arrExcelf.length > 3) {
                    body =
                        'Los archivos generados exceden el límite de 15MB permitido para envío por correo.<br><br>' +
                        `📁 Puede descargarlos desde la carpeta siguiente:<br>` +
                        `<a href="${folderLink}" target="_blank">Abrir Carpeta ActivoFijoArchivos</a>`;
                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: 'Informe proyectado de Ajuste por Inflación a Activo Fijo',
                            body: body
                        });
                }else{
                    let attachments = [fileObj, pdfFile];
                    attachments = attachments.concat(arrExcelf)
                    email.send({
                        author: author,
                        recipients: recipients,
                        subject: 'Informe proyectado de Ajuste por Inflación a Activo Fijo',
                        body: 'Adjunto archivo con los resultados del proceso.',
                        attachments: attachments
                    });

                }

                log.audit(proceso, 'Archivo enviado correctamente por correo.');
            } catch (e) {
                log.error('Summarize Error', e);
            }
        }

        function cleanData(valor) {
            const val = valor.toString().trim();
            if (val === '.00' || val === '.' || val === '') return '0.00';
            return valor;
        }

        const buildFilters = (parameters, assetsExcludes) => {
            let filtros = [];
            let arrConfiguration = parameters.input.configuration;

            if (!utilities.isEmpty(parameters.subsidiary)){
                filtros.push({
                    name: 'custrecord_altdepr_subsidiary',
                    operator: 'ANYOF',
                    values: parameters.subsidiary
                });
            }else {
                let arraySub = arrConfiguration.map(obj => obj.custrecord_l54_config_ajusinf_subsid);
                filtros.push({
                    name: 'custrecord_altdepr_subsidiary',
                    operator: 'ANYOF',
                    values: arraySub
                });
            }
            
            if (!utilities.isEmpty(parameters.assetType)){
                filtros.push({
                    name: 'custrecord_altdepr_assettype',
                    operator: 'ANYOF',
                    values: parameters.assetType
                });
            }
           
            if (!utilities.isEmpty(arrConfiguration) && arrConfiguration.length > 0){
                
                accountingbook = arrConfiguration.map(obj => obj.custrecord_l54_config_ajusinf_libajus);
                accountingbook = [...new Set(accountingbook)];
                log.debug('accountingbook', JSON.stringify(accountingbook))

                filtros.push({
                    name: 'custrecord_altdepr_accountingbook',
                    operator: 'ANYOF',
                    values: accountingbook
                });
            }

            if (!utilities.isEmpty(parameters.input.indexPeriods)){
                let indexPeriods = parameters.input.indexPeriods;
                log.debug('indexPeriods[indexPeriods.length - 1].startdate', indexPeriods[indexPeriods.length - 1].startdate)

                filtros.push({
                    name: 'custrecord_assetpurchasedate',
                    join: 'custrecord_altdeprasset',
                    operator: 'ONORBEFORE',
                    values: indexPeriods[indexPeriods.length - 1].startdate
                });
            }

            // if (!utilities.isEmpty(assetsExcludes) && assetsExcludes.length > 0){
                
            //     filtros.push({
            //         name: 'internalid',
            //         join: 'custrecord_altdeprasset',
            //         operator: 'NONEOF',
            //         values: assetsExcludes
            //     });
            // }

            return filtros;
        };

        // const getComparePeriods = (paramInit, paramDate) => {
        //     let date1 = paramInit,
        //     dia1  = date1.substring(0,2),
        //     mes1  = Number(date1.substring(3,5)),
        //     anio1 = Number(date1.substring(6,10)),
        //     resultDate1 = new Date(anio1,mes1,dia1);

        //     let date2 = paramDate,
        //     dia2  = date2.substring(0,2),
        //     mes2  = Number(date2.substring(3,5)),
        //     anio2 = Number(date2.substring(6,10)),
        //     resulDate2 = new Date(anio2,mes2,dia2);

        //     if(resultDate1 <= resulDate2){
        //         return true;
        //     }

        //     return false;
        // }

        const getComparePeriods = (date1, date2, operador) =>{
            if (!date1 || !date2 || date1.trim() === "" || date2.trim() === "") {
                return false;
            }
            const parseDate = (dateStr) => {
            // Reemplaza guiones por barras si es necesario
            const normalized = dateStr.replace(/-/g, '/').trim();
            const parts = normalized.split('/');
            if (parts.length !== 3) throw new Error(`Formato inválido: ${dateStr}`);
            
                // Convierte a números y asegura que tenga ceros a la izquierda si hace falta
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Mes es base 0 en JS
                const year = parseInt(parts[2], 10);
                
                return new Date(year, month, day);
            };

            let operator = {
                '<': function(a, b) { return a < b; },
                '<=': function(a, b) { return a <= b; },
                '>': function(a, b) { return a > b; },
                '>=': function(a, b) { return a >= b; },
                '==': function(a, b) { return a.getTime() == b.getTime(); },
                '!=': function(a, b) { return a.getTime() != b.getTime(); }
            };

            const resultDate1 = parseDate(date1);
            const resulDate2 = parseDate(date2);

            if (!operator[operador]) {
                throw new Error('Operador no válido: ' + operador);
            }

            return operator[operador](resultDate1, resulDate2);
        }

         const getAssetsExcludes = (rangePeriod) => {
            const idsPEriods = rangePeriod.map(obj => obj.custrecord_l54_axi_indice_mes);
            let filters = [['custrecord_l54_audit_inflation_date_ini', 'anyof', idsPEriods]
                        ];
            let columns = [
                { name: 'formulatext', formula: 'NS_CONCAT({custrecord_l54_audit_inflation_asset.internalid})', alias: 'formulatext1' , summary: 'MIN'}
            ];

            let result = InitSearch.getSearchCreated('customrecord_l54_audit_inflation', filters, columns);
            log.debug("idsPEriods", idsPEriods)
            log.debug("result", result)
            let arrayResult = (result[0].formulatext1).split(',');
            arrayResult = [...new Set(arrayResult)];
            
            return arrayResult;
        }

        const getAssetsTypes = (paramIDS) => {
            let filters = [['internalid', 'anyof', paramIDS]
                        ];
            let columns = [
                { name: 'name', alias: 'name'}
            ];

            let result = InitSearch.getSearchCreated('customrecord_ncfar_assettype', filters, columns);
            log.debug("result", result)
            if(result.length != 0){
               return result.map(item => item.name).join(", ");
            }
            return ""
        }
       
        function encodeBase64(str) {
            return Buffer.from(str, 'utf8').toString('base64');
        }

        const getFolder = () => {
        let filters = [["name", "is", "ActivoFijoArchivos"]
                    ];
        let columns = [
            { name: 'internalid', alias: 'ID' }
        ];

        let array = InitSearch.getSearchCreated('folder', filters, columns);
        
        let folderID;
        if (!array || array.length === 0) {
            const newFolder = record.create({ type: "folder" });
            newFolder.setValue("name", "ActivoFijoArchivos");
            folderID = newFolder.save();
        } else {
            folderID = array[0].ID;
        }
        return folderID;
    }

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            summarize: summarize
        }
    });