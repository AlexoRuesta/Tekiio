/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 */

define(['N/file', 'N/task', 'N/log', './LIB - Search.js'], 
  (file, task, log, libSearch) => {

  const { InitSearch } = libSearch;
  const searchUtil = new InitSearch();

  const execute = () => {
    try {
      log.audit('Inicio', 'Scheduled ejecutándose...');

      const folderName = 'FolderAutomatico';
      const fileName = 'parametrosActivosFijos.txt';

      // 1️⃣ Buscar archivo con LIB - Search
      const fileID = getFileId(folderName, fileName);
      if (!fileID) throw 'No se encontró archivo de parámetros.';

      let fileContent = file.load({ id: fileID }).getContents();
      
      fileContent = JSON.parse(fileContent)

      // 2️⃣ Si es día 1, avanzar periodos
      const today = new Date();
      if (Number(today.getDate()) == 1) {
        log.audit('Es día 1 del mes', 'Actualizando periodos...');

        params.custpage_period_init = getNextPeriodId(params.custpage_period_init);
        params.custpage_period_end  = getNextPeriodId(params.custpage_period_end);

        log.debug('Nuevos parametros', params);

        // Sobrescribir archivo
        file.delete({ id: fileID });

        const folderID = getFolderId(folderName);
        const newFile = file.create({
          name: fileName,
          fileType: file.Type.PLAINTEXT,
          contents: JSON.stringify(params),
          folder: folderID
        });
        newFile.save();
      }

      let objConfiguration = getConfiguration()

      let rangePeriod = getRangePeriod(fileContent)
      log.debug("rangePeriod",JSON.stringify(rangePeriod));

      let indexPeriods = getIndex(rangePeriod);
      log.debug("indexPeriods",JSON.stringify(indexPeriods));
      
      let index = parseFloat(parseFloat(indexPeriods[indexPeriods.length - 1].custrecord_l54_axi_indice_num, 10) / parseFloat(indexPeriods[0].custrecord_l54_axi_indice_num, 10), 10);

      //let user = runtime.getCurrentUser().id;

      let jsonResult = {
          configuration: objConfiguration,
          indexPeriods: indexPeriods,
          //requiredFields: requiredFields,
          index: index,
          user: fileContent.custpage_employee,
          memo: "Ajuste por Inflación de " + indexPeriods[1].periodname + " a " + indexPeriods[indexPeriods.length - 1].periodname
      }

      let params = {
          custscript_l54_inflation_asset_mr_type: fileContent.custpage_asset_type,
          custscript_l54_inflation_asset_mr_input: JSON.stringify(jsonResult)
      }
      log.debug('Parametros actuales', params);

      // 3️⃣ Lanzar MR
      const mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: 'customscript_l54_inflation_asset_mr',
        deploymentId: 'customdeploy_l54_inflation_asset_mr',
        params: params
      });

      const mrId = mrTask.submit();
      log.audit('MR lanzado', `Task ID: ${mrId}`);

    } catch (e) {
      log.error('Scheduled ERROR', e);
      throw e;
    }
  };

  /** Helpers usando LIB - Search */

  const getFolderId = (folderName) => {
    const results = searchUtil.getSearchCreated('folder', [['name', 'is', folderName]], [
      { name: 'internalid', alias: 'ID' }
    ]);
    return results.length ? results[0].ID : null;
  };

  const getFileId = (folderName, fileName) => {
    const folderID = getFolderId(folderName);
    if (!folderID) return null;

    const results = searchUtil.getSearchCreated('file',
      [
        ['folder', 'is', folderID],
        'AND',
        ['name', 'is', fileName]
      ],
      [{ name: 'internalid', alias: 'ID' }]
    );
    return results.length ? results[0].ID : null;
  };

  const getNextPeriodId = (currentPeriodId) => {
  // Busca periodo con ID mayor al actual
  const nextResults = searchUtil.getSearchCreated('accountingperiod',
    [
      ['internalidnumber', 'greaterthan', currentPeriodId],
      'AND',
      ['isquarter', 'is', 'F'],
      'AND',
      ['isyear', 'is', 'F'],
      'AND',
      ['closed', 'is', 'F'] // Opcional: solo abiertos
    ],
    [
      { name: 'internalid', alias: 'ID' },{ name: 'startdate', alias: 'StartDate', sort: 'ASC' }
    ]
  );

  if (!nextResults.length) throw `No se encontró periodo siguiente a ID: ${currentPeriodId}`;

  log.debug('Siguiente periodo:', nextResults[0]);
  return nextResults[0].ID;
};

const getConfiguration = () => {
    let filters = [["isinactive", "is", "F"]
                ];
    let columns = [
        { name: 'internalid', alias: 'ID' },
        { name: 'custrecord_l54_config_ajusinf_subsid', alias: 'custrecord_l54_config_ajusinf_subsid'},
        { name: 'custrecord_l54_config_ajusinf_libajus', alias: 'custrecord_l54_config_ajusinf_libajus'}
    ];

    let array = searchUtil.getSearchCreated('customrecord_l54_config_ajust_inf', filters, columns);
   
    return array;
  }

  const getRangePeriod = (parameters) => {
        log.debug("parameters", JSON.stringify(parameters));
       
        let periodInit = searchUtil.getSearchLookField("accountingperiod", parameters.custpage_period_init, ["internalid","startdate"]);
        let periodEnd = searchUtil.getSearchLookField("accountingperiod", parameters.custpage_period_end, ["internalid","enddate"]);
    
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
                    
        let columns = [
            { name: 'internalid', alias: 'internalid' }, 
            { name: 'periodname', alias: 'periodname' }, 
            { name: 'startdate', alias: 'startdate', sort: 'ASC' }, 
            { name: 'enddate', alias: 'enddate' },
        ];
        
        let array = searchUtil.getSearchCreated("accountingperiod", filters, columns)

        //** Obtengo el periodo previo */
    
        filters = [['startdate', 'before', periodInit.startdate],
                    "AND",
                    ['isadjust', 'is', 'F'], // Opcional: excluir periodos de ajuste
                    "AND",
                    ['isquarter', 'is', 'F'],
                    "AND",
                    ['isyear', 'is', 'F']
                ];

        columns = [
            { name: 'internalid', alias: 'internalid' }, 
            { name: 'periodname', alias: 'periodname' }, 
            { name: 'startdate', alias: 'startdate', sort: 'DESC' }, 
            { name: 'enddate', alias: 'enddate' },
        ];

        
        let array2 = searchUtil.getSearchCreated("accountingperiod", filters, columns)
        
        array.unshift(array2[0]);
        
        return array;
     }

     const getIndex = (parameters) => {
        
        let months = parameters.map(p => p.internalid);
        let filters = [["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_l54_axi_indice_mes", "anyof", months],
                            
                    ];

        let columns = [
            { name: 'periodname', join: 'custrecord_l54_axi_indice_mes', alias: 'periodname'},
            { name: 'startdate', join: 'custrecord_l54_axi_indice_mes', alias: 'startdate', sort: 'ASC'},
            { name: 'enddate', join: 'custrecord_l54_axi_indice_mes', alias: 'enddate'},
            { name: 'custrecord_l54_axi_indice_mes', alias: 'custrecord_l54_axi_indice_mes'},
            { name: 'custrecord_l54_axi_indice_num', alias: 'custrecord_l54_axi_indice_num'}
        ]
        
        let array = searchUtil.getSearchCreated("customrecord_l54_axi_indice", filters, columns)

        const uniqueIndexPeriods = Array.from(
            new Map(
                array.map(item => [JSON.stringify(item), item])
            ).values()
        );

        return uniqueIndexPeriods;
    }

  return { execute };
});
