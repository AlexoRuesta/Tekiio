/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget','N/search','N/file','N/format','N/runtime','N/encode','N/url'],
(ui, search, file, format, runtime, encode, url) => {

  function onRequest(context){
    const req = context.request;
    const res = context.response;

    if (req.method === 'GET') {
      const form = ui.createForm({ title: 'Exportar búsqueda con cabecera y vista previa' });

      // ---- Campos principales
      const fldSearch = form.addField({ id:'custpage_search', type: ui.FieldType.SELECT, label:'Búsqueda Guardada' });
      fldSearch.addSelectOption({ value:'', text:'Seleccione...' });

      const s = search.create({ type:'savedsearch', filters:[], columns:['id','title'] });
      s.run().each(r => {
        fldSearch.addSelectOption({ value: r.getValue('id'), text: r.getValue('title') });
        return true;
      });

      // const fldTitulo = form.addField({ id:'custpage_titulo', type: ui.FieldType.TEXT, label:'Título del reporte' });
      // const fldSubs   = form.addField({ id:'custpage_subsidiaria', type: ui.FieldType.TEXT, label:'Subsidiaria' });
      const fldAutor  = form.addField({ id:'custpage_autor', type: ui.FieldType.TEXT, label:'Autor' });
      if (!req.parameters.custpage_autor) fldAutor.defaultValue = runtime.getCurrentUser().name;

      // Valores previos
      const searchId = req.parameters.custpage_search || '';
      const subsidiaria = req.parameters.custpage_subsidiaria || '';
      const desde = req.parameters.custpage_fecha_desde || '';
      const hasta = req.parameters.custpage_fecha_hasta || '';
      if (req.parameters.custpage_autor) fldAutor.defaultValue = req.parameters.custpage_autor;
      if (searchId) fldSearch.defaultValue = searchId;

       // ----- Filtros dinámicos -----
        const fldSubsidiaria = form.addField({
            id: 'custpage_subsidiaria',
            type: ui.FieldType.SELECT,
            label: 'Subsidiaria',
            source: 'subsidiary'
        });
        if (subsidiaria) fldSubsidiaria.defaultValue = subsidiaria;

        const fldDesde = form.addField({
            id: 'custpage_fecha_desde',
            type: ui.FieldType.DATE,
            label: 'Periodo Desde'
        });
        //if (desde) fldDesde.defaultValue = desde;

        const fldHasta = form.addField({
            id: 'custpage_fecha_hasta',
            type: ui.FieldType.DATE,
            label: 'Periodo Hasta'
        });
        //if (hasta) fldHasta.defaultValue = hasta;

        const fldTitles = form.addField({
            id: 'custpage_encabezados',
            type: ui.FieldType.MULTISELECT,
            label: 'Encabezado',
            source: 'customrecord_tek_encabezados'
        });

      // ---- Sublista de columnas (con checkbox para elegir)
      const subCols = form.addSublist({ id:'custpage_columns', label:'Columnas disponibles', type: ui.SublistType.LIST });
      subCols.addField({ id:'select',  type: ui.FieldType.CHECKBOX, label:'Exportar' });
      subCols.addField({ id:'colname', type: ui.FieldType.TEXT,     label:'Nombre de columna' });
      subCols.addField({ id:'colid',   type: ui.FieldType.TEXT,     label:'Idx' })
            .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

      // ---- Sublista de vista previa (hasta 5 columnas y 10 filas para no saturar)
      const MAX_PREV_COLS = 30;
      const MAX_PREV_ROWS = 10;
      const subPrev = form.addSublist({ id:'custpage_preview', label:'Vista previa', type: ui.SublistType.LIST });
      

      if (searchId){
        try{
          const saved = search.load({ id: searchId });
          const cols  = saved.columns;
          log.debug("cols", cols.length)
          for (let i=0; i<cols.length; i++){
          subPrev.addField({ id:`col${i}`, type: ui.FieldType.TEXT, label:cols[i].label || cols[i].name || `Col ${i + 1}` });
        }

        // Aplicar filtros dinámicos (subsidiaria + fechas)
        const filtrosExtras = [];
        log.debug("desde", desde)
        if (subsidiaria) {
            filtrosExtras.push(['subsidiary', 'anyof', subsidiaria]);
        }
        if (desde && hasta) {
            filtrosExtras.push('AND', ['trandate', 'within', desde, hasta]);
        } else if (desde) {
            filtrosExtras.push('AND', ['trandate', 'onorafter', desde]);
        } else if (hasta) {
            filtrosExtras.push('AND', ['trandate', 'onorbefore', hasta]);
        }

        // Combinar filtros
        saved.filters.concat(filtrosExtras);

        log.debug("saved.filters", saved.filters)

          // --- Llenar sublista de columnas
          for (let i=0; i<cols.length; i++){
            subCols.setSublistValue({ id:'colname', line:i, value: (cols[i].label || cols[i].name || `Col ${i+1}`) });
            subCols.setSublistValue({ id:'colid',   line:i, value: String(i) });
            // opcional: marcar todas por defecto
            subCols.setSublistValue({ id:'select',  line:i, value: 'T' });
          }

          // --- Vista previa (primeras filas y hasta 5 columnas)
          const showCols = cols.slice(0, MAX_PREV_COLS);
          const results = saved.run().getRange({ start:0, end: MAX_PREV_ROWS }) || [];
          for (let r=0; r<results.length; r++){
            for (let c=0; c<showCols.length; c++){
              const v = results[r].getValue(showCols[c]);
              subPrev.setSublistValue({
                id: `col${c}`,
                line: r,
                value: (v == null ? '' : String(v))
              });
            }
          }
        } catch(e){
          // Si hay error, mostramos algo breve en la primera celda
          subPrev.setSublistValue({ id:'col1', line:0, value: `Error cargando búsqueda: ${e.name || ''} ${e.message || e}` });
        }
      }

      // Botón Exportar (POST)
      form.addSubmitButton({ label:'Exportar Excel' });

      // ClientScript: escucha cambio del select y recarga la misma URL con params
      form.clientScriptModulePath = './L54 - Test SL Impresion Client.js';
      res.writePage(form);
      return;
    }

    // --------- POST: Generar XLS (SpreadsheetML) con cabecera y columnas seleccionadas
    if (req.method === 'POST') {
      const searchId   = req.parameters.custpage_search;
      const titulo     = req.parameters.custpage_titulo || 'Reporte';
      const subsidiaria= req.parameters.custpage_subsidiaria || '';
      const autor      = req.parameters.custpage_autor || '';
      const fecha      = format.format({ value: new Date(), type: format.Type.DATE });

      const saved      = search.load({ id: searchId });
      const allCols    = saved.columns;

      const encabezadosSeleccionados = req.parameters.custpage_encabezados
        ? [].concat(req.parameters.custpage_encabezados) // maneja arrays o single
        : [];

      // Buscar datos de los encabezados seleccionados
      let headersData = [];

      if (encabezadosSeleccionados.length > 0) {
        const headerSearch = search.create({
          type: 'customrecord_tek_encabezados',
          filters: [['internalid', 'anyof', encabezadosSeleccionados]],
          columns: ['custrecord_tek_encabezados_id', 'custrecord_tek_encabezados_title', 'name']
        });

        headerSearch.run().each(r => {
          let result = "";
          var objFieldLookUp = search.lookupFields({
              type: 'subsidiary',
              id: subsidiaria,
              columns: [r.getValue('custrecord_tek_encabezados_id')]
          });
          log.debug("objFieldLookUp", objFieldLookUp)
          // if(objFieldLookUp[r.getValue('custrecord_tek_encabezados_id')] != null){
          //   result = objFieldLookUp[r.getValue('custrecord_tek_encabezados_id')]
          // }else if(objFieldLookUp[r.getValue('custrecord_tek_encabezados_id')][0] != null){
          //   result = objFieldLookUp[r.getValue('custrecord_tek_encabezados_id')][0].text
          // }else{
          //   result = 'no seeee'
          // }
          result = getLookupValue(objFieldLookUp, r.getValue('custrecord_tek_encabezados_id'))
          log.debug("result", result)
          headersData.push({
            idCampo: r.getValue('custrecord_tek_encabezados_id'),
            nivel: parseInt(r.getValue('custrecord_tek_encabezados_title')) || 1,
            nombre: result
          });
          return true;
        });
      }

      // Recuperar columnas elegidas (checkboxes en sublista)
      const lineCount  = req.getLineCount({ group:'custpage_columns' });
      const selected   = [];
      for (let i=0; i<lineCount; i++){
        const checked = req.getSublistValue({ group:'custpage_columns', name:'select', line:i });
        if (checked === 'T'){
          const idx = parseInt(req.getSublistValue({ group:'custpage_columns', name:'colid', line:i }), 10);
          if (!Number.isNaN(idx)) selected.push(allCols[idx]);
        }
      }
      const cols = selected.length ? selected : allCols;

      let estilos = `
        <Styles>
          <Style ss:ID="Title1"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="16"/></Style>
          <Style ss:ID="Title2"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="12"/></Style>
          <Style ss:ID="Title3"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="8"/></Style>
        </Styles>
        `;

        let headerRows = '';
        headersData.forEach(h => {
          const styleId = h.nivel === 1 ? 'Title1' : h.nivel === 2 ? 'Title2' : 'Title3';
          headerRows += `
          <Row>
            <Cell ss:StyleID="${styleId}" ss:MergeAcross="${cols.length - 1}">
              <Data ss:Type="String">${h.nombre}</Data>
            </Cell>
          </Row>`;
        });

        // Agregamos línea vacía después de encabezados
        headerRows += '<Row></Row>';

        // Insertamos los estilos al inicio del Workbook
        let xmlHeader = `<?xml version="1.0"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        ${estilos}
        <Worksheet ss:Name="Reporte">
          <Table>`;

      const colTitles = '   <Row>' + cols.map(c => `<Cell><Data ss:Type="String">${c.label || c.name || 'Columna'}</Data></Cell>`).join('') + '</Row>';

      let dataRows = '';
      saved.run().each(result => {
        let row = '   <Row>';
        for (const c of cols){
          const v = result.getValue(c);
          row += `<Cell><Data ss:Type="String">${(v==null?'':String(v))}</Data></Cell>`;
        }
        row += '</Row>\n';
        dataRows += row;
        return true;
      });

      const xml = `${xmlHeader}\n${headerRows}\n${colTitles}\n${dataRows}  </Table>\n </Worksheet>\n</Workbook>`;

      const base64Content = encode.convert({
        string: xml,
        inputEncoding: encode.Encoding.UTF_8,
        outputEncoding: encode.Encoding.BASE_64
      });

      const fileObj = file.create({
        name: `ExportBusqueda_${searchId}.xls`,
        fileType: file.Type.EXCEL,           // requiere base64 -> ya convertimos
        contents: base64Content
      });

      context.response.writeFile(fileObj, true);
    }
  }

  function getLookupValue(objLookup, fieldName) {
  if (!objLookup || !fieldName || !objLookup.hasOwnProperty(fieldName)) {
    return null;
  }

  const value = objLookup[fieldName];

  // Si el valor es null o undefined
  if (value == null) {
    return null;
  }

  // Si es un array (ej. campos tipo list o record references)
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // Devolver texto si existe, o value interno si no
    const first = value[0];
    return first.text || first.value || null;
  }

  // Si es un objeto (ej. tipo booleano o valor compuesto)
  if (typeof value === 'object') {
    return value.text || value.value || JSON.stringify(value);
  }

  // Si es string, number o boolean
  return value;
}

  return { onRequest };
});
