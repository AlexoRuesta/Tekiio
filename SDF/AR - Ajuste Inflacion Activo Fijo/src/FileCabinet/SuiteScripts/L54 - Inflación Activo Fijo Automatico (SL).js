/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * @NModuleScope Public
 */

define(['N/url', 'LIB - Form', 'LIB - Search', 'N/file', 'N/record', 'N/redirect', 'N/task'], (url, libForm, libSearch, file, record, redirect, task) => {

  const { UserInterface } = libForm;
  const ui = new UserInterface();

  const { InitSearch } = libSearch;
  const searchUtil = new InitSearch();

  const onRequest = (context) => {

    if (context.request.method === 'GET') {
      let nameReport = "Configuración del Proceso Automatico";
      ui.createForm(nameReport);

      let conteinerID_1 = 'custpage_group_filters',
          conteinerID_2 = 'custpage_group_results';

        ui.addFieldGroup(conteinerID_1, 'Filtros de Búsqueda'); 
        ui.addFieldGroup(conteinerID_2, 'Resultados');

      let data = getConfiguration()
      heads = ['ID', 'Subsidiaria', 'Libro Ajuste', 'Acción']
      let html = `
        <style>
            #matriz-container table { border-collapse: collapse; width: 100%; }
            #matriz-container th, #matriz-container td { border: 1px solid #ccc; padding: 6px; text-align: center; }
            #matriz-container input { width: 80px; text-align: center; }
            #matriz-container th { background-color: #f0f0f0; }
        </style>
        <div id="matriz-container">
        <table>
            <thead>
                <tr>
                    ${heads.map(h => `<th>${(h)}</th>`).join('')}
                </tr>
            </thead>
        <tbody>
        `;

      data.forEach(row => {
        let link = url.resolveRecord({
          recordType: 'customrecord_l54_config_ajust_inf',
          recordId: row.ID,
          isEditMode: true
        });

        html += `
          <tr>
            <td>${row.ID}</td>
            <td>${row.Subsidiaria}</td>
            <td>${row.LibroAjuste || ''}</td>
            <td><a href="${link}" target="_blank">Editar</a></td>
          </tr>
        `;
    });
    html += `</tbody></table></div>`;

    let assetType = ui.addField("custpage_asset_type", 'multiselect', "Tipo Activo: ", conteinerID_1, "customrecord_ncfar_assettype"),
        dateInit = ui.addField("custpage_period_init", 'select', "Periodo Desde: ", conteinerID_1, "accountingperiod"),
        dateEnd = ui.addField("custpage_period_end", 'select', "Periodo Hasta: ", conteinerID_1, "accountingperiod"),
        warning = ui.addField('custpage_warning', 'inlinehtml', 'Advertencia', conteinerID_1),
        temporality = ui.addField('custpage_temporality', 'select', 'Tipo de Ejecución: ', conteinerID_1),
        employee = ui.addField('custpage_employee', 'select', 'Empleado Encargado: ', conteinerID_1, 'employee'),
        resultsField = ui.addField('custpage_results', 'inlinehtml', 'Resultado', conteinerID_2, null);
        
        warning.setDefaultValue('<div style=\"color: gray; font-size: 8pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">⚠️ <strong>Nota:</strong> Estos parámetros se usarán automáticamente en la próxima ejecución del proceso.</div>');
        warning.updateLayoutType('OUTSIDEBELOW');

        temporality.addSelectOption('1', 'Diario');
        temporality.addSelectOption('2', 'Mensual (1 de cada mes)')
        
        resultsField.setDefaultValue(html);
        
    let configurationFile = getFile();
    log.debug("configurationFile", configurationFile)
    
    if(configurationFile.length != 0){
        let information = file.load(configurationFile[0].ID).getContents();
        information = JSON.parse(information);
        log.debug("information", information)
        log.debug("custpage_period_end", information.custpage_period_end)
        assetType.setDefaultValue(information.custpage_asset_type);
        dateInit.setDefaultValue(information.custpage_period_init);
        dateEnd.setDefaultValue(information.custpage_period_end);
        temporality.setDefaultValue(information.custpage_temporality);
        employee.setDefaultValue(information.custpage_employee);
    }
      ui.addSubmitButton('Actualizar');

      context.response.writePage(ui.FORM);

    } else {
      let jsonResult = {
            custpage_asset_type: context.request.parameters.custpage_asset_type,
            custpage_period_init: context.request.parameters.custpage_period_init,
            custpage_period_end: context.request.parameters.custpage_period_end,
            custpage_temporality: context.request.parameters.custpage_temporality,
            custpage_employee: context.request.parameters.custpage_employee
        }

    let folderID = getFolder();
    setFile(jsonResult, folderID);

    submitMapReduceTask("customscript_l54_inflation_asset_aut_ss", "customdeploy_l54_inflation_asset_aut_ss");

    redirect.toSuitelet({
        scriptId: "customscript_l54_inflation_asset_aut_sl",
        deploymentId: "customdeploy_l54_inflation_asset_aut_sl"
    });
    }
  };

  const getConfiguration = () => {
    let filters = [["isinactive", "is", "F"]
                ];
    let columns = [
        { name: 'internalid', alias: 'ID' },
        { name: 'custrecord_l54_config_ajusinf_subsid', alias: 'Subsidiaria' , asText: true},
        { name: 'custrecord_l54_config_ajusinf_libajus', alias: 'LibroAjuste' , asText: true}
    ];

    let array = searchUtil.getSearchCreated('customrecord_l54_config_ajust_inf', filters, columns);
    
    return array;
  }

  const setFile = (rptJson, folderID) => {
        let fileID = getFile();
        log.debug("fileID", fileID)
        if (fileID.length != 0 ) {
            log.debug("Encontrado fileID", fileID);

            file.delete({
                id: fileID[0].ID
            });
        }

        fileObj = file.create({
            name: "parametrosActivosFijos.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(rptJson),
            folder: folderID
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);

        return txt;
    }

    const getFile = () => {
      let filters = [["name", "is", "parametrosActivosFijos.txt"]
                  ];
      let columns = [
          { name: 'internalid', alias: 'ID' }
      ];

      let array = searchUtil.getSearchCreated('file', filters, columns);
      
      return array;
    }
  const submitMapReduceTask = (script, deploy) => {
    
      let scriptTask = task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT,
          scriptId: script,
          deploymentId: deploy
      });
      let scriptTaskId = scriptTask.submit();
    }
  const getFolder = () => {
        let filters = [["name", "is", "FolderAutomatico"]
                    ];
        let columns = [
            { name: 'internalid', alias: 'ID' }
        ];

        let array = searchUtil.getSearchCreated('folder', filters, columns);
        
        let folderID;
        if (!array || array.length === 0) {
            const newFolder = record.create({ type: "folder" });
            newFolder.setValue("name", "FolderAutomatico");
            folderID = newFolder.save();
        } else {
            folderID = array[0].ID;
        }
        return folderID;
    }

  return { onRequest };
});
