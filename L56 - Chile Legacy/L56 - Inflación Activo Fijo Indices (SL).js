/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/L56 - configuration.json
 */
define(['N/ui/serverWidget', 'N/record', 'N/runtime', 'LIB - Form', 'LIB - Search', 'L56/utilidades', 'N/search'], function(serverWidget, record, runtime, libForm, libSearch, utilities, search) {

    let { UserInterface } = libForm;
    let userInterface = new UserInterface();

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
        let method = context.request.method,
            nameReport = "Tabla IPC"
            FN = "main"; 
        
        userInterface.createForm(nameReport);   
        userInterface.setClientScript("./L56 - Inflación Activo Fijo (CL).js");

        let parameters = getParametersWithDefaultValues(context.request.parameters);
            log.debug("parameters", parameters);
        
        let rangePeriodYear = getRangePeriodYears();
        let rangePeriod = !utilities.isEmpty(parameters.year) ? getRangePeriod(parameters.year) : [];
        let indexes = !utilities.isEmpty(parameters.year) ? getIndexes(parameters.year) : [];
        log.debug("indexes", indexes)
        
        let resultIndexes = indexes.length != 0 ?  JSON.parse(indexes[0].custrecord_l56_axi_indice_num_sl) : [];
        log.debug("resultIndexes", resultIndexes)

        // Construir tabla matriz PERIODO / PERIODO
        let html = `
            <style>
                #matriz-container table { border-collapse: collapse; width: 100%; }
                #matriz-container th, #matriz-container td { border: 1px solid #ccc; padding: 6px; text-align: center; }
                #matriz-container input { width: 80px; text-align: center; }
                #matriz-container th { background-color: #f0f0f0; }
            </style>
            <div id="matriz-container">
            <table id="matrixTable">
                <thead>
                    <tr>
                        <th></th>
                        ${rangePeriod.map(p => `<th>${(p.periodname).split(' ')[0]}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        rangePeriod.unshift({
            periodname: 'Capital Inicial',
            internalid: 0
        })
        rangePeriod.forEach((row, i) => {
            html += `<tr><th>${(row.periodname).split(' ')[0]}</th>`;
            rangePeriod.forEach((col, j) => {
                if (j === 0) return; 
                let k = j-1;
                let val = !utilities.isEmpty(resultIndexes[i]) && !utilities.isEmpty(resultIndexes[i][k-i]) ? resultIndexes[i][k-i] : ''; // Si i === j, celda diagonal (vacía o no editable)
                let input = (row.internalid >= col.internalid)
                    ? `<td></td>`
                    : `<td><input data-row="${row.internalid}" data-col="${col.internalid}" value="${val}"/></td>`;
                html += input;
            });
            html += '</tr>';
        });

        html += `</tbody></table></div>
        <script>
            function serializeMatrix() {
                const data = [];
                const rowData = [];
                const rows = document.querySelectorAll("#matrixTable tbody tr");
                rows.forEach((tr, rowIdx) => {
                    const rowDataSL = [];
                    tr.querySelectorAll("td input").forEach((input, colIdx) => {
                        rowData.push({
                            value: input.value,
                            row: input.dataset.row,
                            col: input.dataset.col
                        });
                        rowDataSL.push(input.value);
                    });
                    data.push(rowDataSL);
                });
                document.getElementById("custpage_matrix_data_sl").value = JSON.stringify(data);
                document.getElementById("custpage_matrix_data").value = JSON.stringify(rowData);
            }

            document.addEventListener("submit", function(e) {
                serializeMatrix();
            }, true);
        </script>
        `;

        let conteinerID_1 = "custpage_group_filters",
            conteinerID_2 = "custpage_group_results";

            userInterface.addFieldGroup(conteinerID_1, "Filtros");
            userInterface.addFieldGroup(conteinerID_2, "Resultados");

        
        let year = userInterface.addField("custpage_year", serverWidget.FieldType.SELECT, "Año: ", conteinerID_1, null);
        let matriz = userInterface.addField("custpage_matrix_data", serverWidget.FieldType.LONGTEXT, "Datos Matriz: ", conteinerID_1, null);
        let matrizSl = userInterface.addField("custpage_matrix_data_sl", serverWidget.FieldType.LONGTEXT, "Datos Matriz:: ", conteinerID_1, null);
        let data = userInterface.addField("custpage_data_html", serverWidget.FieldType.INLINEHTML, "Data: ", conteinerID_2, null);

        year.addSelectOption('', 'Selecciona un año');

        for (var i = rangePeriodYear.length - 1; i >= 0; i--) {
            year.addSelectOption(rangePeriodYear[i].internalid, rangePeriodYear[i].periodname);
        }

        data.setDefaultValue(html);
        year.setDefaultValue(parameters.year);
        matriz.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
        matrizSl.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

        userInterface.addSubmitButton("Guardar");


        if (method === 'POST') {
            userInterface.init();
            const jsonData = context.request.parameters.custpage_matrix_data;
            const jsonDataSl = context.request.parameters.custpage_matrix_data_sl;
            const year = context.request.parameters.custpage_year;

            let indexes = getIndexes(year);
            log.debug("indexes", indexes)
            log.debug("jsonData", JSON.stringify(jsonData))
            log.debug("jsonDataSl", JSON.stringify(jsonDataSl))

            if(indexes.length != 0){
                var rec = record.load({
                    type: 'customrecord_l56_axi_indice',
                     id: indexes[0].internalid
                })
            }else{
                var rec = record.create({
                    type: 'customrecord_l56_axi_indice',
                    isDynamic: true
                })
            }
            
            rec.setValue({
                fieldId: 'custrecord_l56_axi_indice_num_sl',
                value: jsonDataSl
            });

            rec.setValue({
                fieldId: 'custrecord_l56_axi_indice_num',
                value: jsonData
            });

            rec.setValue({
                fieldId: 'custrecord_l56_axi_indice_per_adq',
                value: year
            });
            rec.save();

            userInterface.addPageInitMessage('Los datos se guardaron correctamente.', 'CONFIRMATION','Guardado')
        }

        context.response.writePage(userInterface.FORM);
    }

    const getRangePeriod = (year) => {
        let periodFields = InitSearch.getSearchLookField("accountingperiod", year, ["internalid", "startdate", "enddate"]);
        let filters = [['startdate', 'onorafter', periodFields.startdate],
                        "AND",
                        ['enddate', 'onorbefore', periodFields.enddate],
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
        
        return array;
    }

    const getRangePeriodYears = () => {
        let filters = [['isyear', 'is', 'T'], 
                        'and', 
                        ['closed', 'is', 'F']
                    ];
                    
        let columns = ["internalid", 
                        "periodname"]
        
        let array = InitSearch.getSearchCreated("accountingperiod", filters, columns);
        return array;
    }

     const getIndexes = (year) => {
        let filters = [
                        ['custrecord_l56_axi_indice_per_adq', 'equalto', year]
                    ];
                    
        let columns = ['internalid', 'custrecord_l56_axi_indice_num', 'custrecord_l56_axi_indice_num_sl']
        
        let array = InitSearch.getSearchCreated("customrecord_l56_axi_indice", filters, columns);
        return array;
    }

    const getParametersWithDefaultValues = (parameters) => {
        return {
            year: parameters.year || ""
        }
    }

    return {
        onRequest: onRequest
    };
});
