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
      let params = JSON.parse(fileContent);

      log.debug('Parametros actuales', params);

      // 2️⃣ Si es día 1, avanzar periodos
      const today = new Date();
      if (true) {
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

  return { execute };
});
