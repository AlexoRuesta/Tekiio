/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/L54 - configuration.json
 *@NModuleScope Public
 */
define(['N/render','N/search','N/file','N/format','N/runtime','N/encode','N/url','LIB - Form', 'LIB - Search', 'L54 - utilidades'],
(render, search, file, format, runtime, encode, url, libForm, libSearch, utilities) => {

  let { InitSearch } = libSearch;
        InitSearch = new InitSearch();
        
    let { UserInterface } = libForm;
        UserInterface = new UserInterface();


  function onRequest(context){

    try {
      const method = context.request.method;
      const req = context.request;
      const res = context.response;

      if (method === 'GET') {
        let nameReport = 'AR - Generador Reporte Fiscales';
        
        UserInterface.createForm(nameReport);
        UserInterface.setClientScript("./L54 - Generador Reporte Fiscales (CL).js");

        // Valores previos
        log.debug("Prametros",  req.parameters)
        const searchId = req.parameters.custpage_search || '';
        const subsidiaria = req.parameters.custpage_subsidiaria || '';
        const desde = req.parameters.custpage_fecha_desde || '';
        const hasta = req.parameters.custpage_fecha_hasta || '';

        // ====== 1. GRUPO DE FILTROS ======
        let conteinerID_1 = "custpage_group_filters";
            UserInterface.addFieldGroup(conteinerID_1, "Filtros");

        // ---- Campos principales
        let fldSearch = UserInterface.addField('custpage_search', 'select', 'Seleccione la Búsqueda: ', conteinerID_1).setMandatory(true);
        let fldSubsidiaria = UserInterface.addField('custpage_subsidiaria', 'select', 'Subsidiaria: ', conteinerID_1, 'subsidiary').setMandatory(true);
        let fldDesde = UserInterface.addField('custpage_fecha_desde', 'date', 'Periodo Desde: ', conteinerID_1);
        let fldHasta = UserInterface.addField('custpage_fecha_hasta', 'date', 'Periodo Hasta: ', conteinerID_1);
        let fldFomato = UserInterface.addField("custpage_formato", "select", "Formato de Exportación", conteinerID_1);

         let confSS = InitSearch.getSearchCreated(
            'customrecord_tk_conf_ss_enc', 
            [['isinactive', 'is', 'F']], 
            [
                { name: 'internalid', alias: 'ID' , sort: 'ASC'},
                { name: 'name', alias: 'name' },
                { name: 'custrecord_tk_conf_ss_enc_id_ss', alias: 'custrecord_tk_conf_ss_enc_id_ss'}
            ]
        );
        
        if (confSS.length > 0){
          fldSearch.addSelectOption( 0,'--- Seleccione ---');
          for (var i = 0; i < confSS.length; i++){
            let result = confSS[i];
            fldSearch.addSelectOption(result.custrecord_tk_conf_ss_enc_id_ss, result.name );
          }
        }

        fldFomato.addSelectOption("EXCEL", "Excel (.xls)", true);
        fldFomato.addSelectOption("PDF", "PDF (.pdf)");

         // ---- Sublista de columnas (con checkbox para elegir)
        const subPrev = UserInterface.addSublist('custpage_preview', 'list', 'Vista previa');
        const subCols = UserInterface.addSublist('custpage_columns', 'list', 'Columnas disponibles');
        const subEncabezados = UserInterface.addSublist('custpage_encabezados_list', 'list', 'Encabezados Personalizables');


        subCols.addSublistField('select',  'checkbox', 'Exportar');
        subCols.addSublistField('colname', 'text', 'Nombre de columna' );
        subCols.addSublistFieldHidden('colid',  'text', 'Idx' );

        
        subEncabezados.addSublistField('select',  'checkbox', 'Incluir' );
        subEncabezados.addSublistField('nombre',  'text', 'Nombre' );
        let nivelFld = subEncabezados.addSublistField('nivel',  'select', 'Nivel de Título' );
        subEncabezados.addSublistFieldHidden('colid',  'text', 'Idx' );

        nivelFld.addSelectOption('1', 'Título 1' );
        nivelFld.addSelectOption('2', 'Título 2' );
        nivelFld.addSelectOption('3', 'Título 3' );

        if (!desde) {
            let firstDay = new Date();
            firstDay.setDate(1); // primer día del mes

            let firstDayNetsuite = format.format({
                value: firstDay,
                type: format.Type.DATE
            });

            fldDesde.setDefaultValue(firstDayNetsuite);
        }

        if (!hasta) {
            let lastDay = new Date();
            lastDay = new Date(
                lastDay.getFullYear(),
                lastDay.getMonth() + 1,
                0 // último día del mes
            );

            let lastDayNetsuite = format.format({
                value: lastDay,
                type: format.Type.DATE
            });

            fldHasta.setDefaultValue(lastDayNetsuite);
        }
        
        fldSearch.setDefaultValue(searchId);
        if(subsidiaria) fldSubsidiaria.setDefaultValue(subsidiaria);
        if(desde) fldDesde.setDefaultValue(desde);
        if(hasta) fldHasta.setDefaultValue(hasta);
        
        UserInterface.addSubmitButton("Generar Reporte");

        // Cargar registros del record TEK
        let encSearch = InitSearch.getSearchCreated(
            'customrecord_tek_encabezados', 
            [['isinactive', 'is', 'F']], 
            [
                { name: 'internalid', alias: 'ID' , sort: 'ASC'},
                { name: 'name', alias: 'name' },
                { name: 'custrecord_tek_encabezados_id', alias: 'custrecord_tek_encabezados_id'}
            ]
        );

        if (encSearch.length > 0){
          for (var i = 0; i < encSearch.length; i++){
            let result = encSearch[i];
            subEncabezados.setSublistValue('select', i, 'T')
            subEncabezados.setSublistValue('nombre', i, result.name)
            subEncabezados.setSublistValue('nivel', i, 1)
            subEncabezados.setSublistValue('colid', i, result.custrecord_tek_encabezados_id)
          }
        }

        if (searchId){
          try{
            // Aplicar filtros dinámicos (subsidiaria + fechas)
            let filtrosExtras = [],
                alias = [],
                arrVal = [];

            if (subsidiaria) {
              filtrosExtras.push({
                  name: "subsidiary",
                  operator: "ANYOF",
                  values: subsidiaria
              });
            }
            
            if (desde) { 
              filtrosExtras.push({
                  name: "trandate",
                  operator: "onorafter",
                  values: desde
              });
            } 
            
            if (hasta) { 
              filtrosExtras.push({
                  name: "trandate",
                  operator: "onorbefore",
                  values: hasta
              });
            } 

            let filters = filtrosExtras.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
          
            const saved = InitSearch.getSavedSearch(searchId);
            const cols  = saved.columns;
            log.debug("cols", cols)

            for (let i=0; i<cols.length; i++){
              subPrev.addSublistField(`col${i}`,'text', cols[i].label || cols[i].name || `Col ${i + 1}` );
            }

            // --- Llenar sublista de columnas
            for (let i=0; i<cols.length; i++){
             if (['tranid', 'custbody_54_cuit_entity', 'internalid'].some(word => cols[i].name.includes(word))) {
                arrVal.push((`col${i}`));
              }
              alias.push((`col${i}`));
              subCols.setSublistValue('colname', i, (cols[i].label || cols[i].name || `Col ${i+1}`) );
              subCols.setSublistValue('colid', i, String(i));
              // opcional: marcar todas por defecto
              subCols.setSublistValue('select', i, 'T');
            }
            log.debug("alias", alias)
            log.debug("arrVal", arrVal)
            const savedResult = InitSearch.getResultSearch(searchId, filters, alias);

            for (let r=0; r < savedResult.length; r++){
              let obj = savedResult[r];
              for (let key in obj) {
                if(arrVal.indexOf(key) != -1){
                  subPrev.setSublistValue(key, r, limpiarValorEspe(obj[key]))
                }else{subPrev.setSublistValue(key, r, limpiarValor(obj[key]))}
              }
            }
          } catch(e){
            // // Si hay error, mostramos algo breve en la primera celda
            // subPrev.setSublistValue({ id:'col1', line:0, value: `Error cargando búsqueda: ${e.name || ''} ${e.message || e}` });
            log.error("ERROR EN LA EJECUCIÓN DE LA BÚSQUEDA", e)
          }
        }

        
        context.response.writePage(UserInterface.FORM);
      }
      if (method === 'POST') {
        
        const params = req.parameters;
        const delimiterCampos = /\u0001/;
        const delimiterArray = /\u0002/;
        let listEncabezados = [];
        let headersData = [];
        let arrEncabezados = [];
        let nameSS = '';

        const searchId = params.custpage_search;
        const subsidiaria = params.custpage_subsidiaria;
        const desde = params.custpage_fecha_desde;
        const hasta = params.custpage_fecha_hasta;
        const formato = params.custpage_formato;

        const registros = req.parameters.custpage_previewdata.split(delimiterArray);

        const encabezadosSeleccionados = req.parameters.custpage_encabezados_listdata
        ? [].concat(req.parameters.custpage_encabezados_listdata.split(delimiterArray)) // maneja arrays o single
        : [];
        
        log.debug("encabezadosSeleccionados", encabezadosSeleccionados)
         
        for (var i = 0; i < encabezadosSeleccionados.length; i++) {
          let aux = encabezadosSeleccionados[i].split(delimiterCampos);
          
          if (!utilities.isEmpty(aux)) {
              if (aux[0] == 'T'){
                
                listEncabezados.push({id: aux[3], nivel: aux[2]})
                arrEncabezados.push(aux[3])
              }

            }
        }

        if (listEncabezados.length > 0 && !utilities.isEmpty(subsidiaria)) {
          let objFieldLookUp = InitSearch.getSearchLookField("subsidiary", subsidiaria, arrEncabezados);

          for (var i = 0; i < listEncabezados.length; i++){
            let result = getLookupValue(objFieldLookUp, listEncabezados[i].id);
            
             headersData.push({
              nivel: listEncabezados[i].nivel,
              nombre: result
            });
          }
        }
        
        log.debug("headersData", headersData)
        // Recuperar columnas elegidas (checkboxes en sublista)
        const lineCount  = req.getLineCount({ group:'custpage_columns' });
        const selected   = [];
        const cols   = [];
        for (let i=0; i<lineCount; i++){
          const checked = req.getSublistValue({ group:'custpage_columns', name:'select', line:i });
          if (checked === 'T'){
            const idx = parseInt(req.getSublistValue({ group:'custpage_columns', name:'colid', line:i }), 10);
            const colname = req.getSublistValue({ group:'custpage_columns', name:'colname', line:i });
            if (!Number.isNaN(idx)) selected.push(idx);
            cols.push({label: colname});
          }
        }

        let confSS = InitSearch.getSearchCreated(
            'customrecord_tk_conf_ss_enc', 
            [['isinactive', 'is', 'F']], 
            [
                { name: 'internalid', alias: 'ID' , sort: 'ASC'},
                { name: 'name', alias: 'name' },
                { name: 'custrecord_tk_conf_ss_enc_id_ss', alias: 'custrecord_tk_conf_ss_enc_id_ss'}
            ]
        );
        
        if (confSS.length > 0){
          
          for (var i = 0; i < confSS.length; i++){
            let result = confSS[i];
            if(result.custrecord_tk_conf_ss_enc_id_ss == searchId) nameSS = result.name
          }
        }
        log.debug("Nombre del reporte generado", nameSS)

        if(nameSS != ''){
          headersData.push({
              nivel: 1,
              nombre: nameSS
            });
        }

        if(desde && hasta){
          headersData.push({
              nivel: 1,
              nombre: 'Rango: ' + desde + ' - ' + hasta
            });
        }else{
          if(desde){
            headersData.push({
                nivel: 1,
                nombre: 'Rango: ' + desde + ' - '
              });
          }

          if(hasta){
            headersData.push({
                nivel: 1,
                nombre: 'Rango: ' + ' - ' + hasta
              });
          }
        }

        if(formato === "EXCEL"){
          // const cols = selected.length ? selected : allCols;
          let estilos = `
          <Styles>
            <Style ss:ID="Title1"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="16"/></Style>
            <Style ss:ID="Title2"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="12"/></Style>
            <Style ss:ID="Title3"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="8"/></Style>
          </Styles>
          `;

          let headerRows = '';
          headersData.forEach(h => {
            const styleId = h.nivel === "1" ? 'Title1' : h.nivel === "2" ? 'Title2' : 'Title3';
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

          registros.forEach(result => {
            let row = '   <Row>';
            for (let c = 0; c < selected.length; c++) {
              let val = selected[c];
              const v = result.split(delimiterCampos)[val];
              row += `<Cell><Data ss:Type="String">${(v==null?'':String(v))}</Data></Cell>`;
            }
            row += '</Row>\n';
            dataRows += row;
            return true;
          })

          const xml = `${xmlHeader}\n${headerRows}\n${colTitles}\n${dataRows}  </Table>\n </Worksheet>\n</Workbook>`;

          const base64Content = encode.convert({
            string: xml,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
          });

          const TEMP_FOLDER_ID = -15; // "SuiteScripts" o cualquier carpeta accesible

          const fileObj = file.create({
            name: `ExportBusqueda_${searchId}` + new Date() + `.xls`,
            fileType: file.Type.EXCEL,
            contents: base64Content,
            folder: TEMP_FOLDER_ID
          });

          fileObj.isOnline = true; // ✅ permite obtener la URL
          const fileId = fileObj.save();
          const savedFile = file.load({ id: fileId });

          // 🔹 Generar el script para abrir el archivo en nueva pestaña y volver al SL
          const redirectUrl = url.resolveScript({
            scriptId: runtime.getCurrentScript().id,
            deploymentId: runtime.getCurrentScript().deploymentId
          });

          res.write(`
            <html>
              <script>
                window.open("${savedFile.url}", "_blank"); // abre archivo
                window.location.href = "${redirectUrl}";   // recarga Suitelet
              </script>
            </html>
          `);
        }else {
          function xmlEscape(txt) {
            if (txt === null || txt === undefined) return '';
            return String(txt)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
          }

          var fechaHoy = format.format({ value: new Date(), type: format.Type.DATE });

          // Encabezados jerarquizados
          var encabezadosHTML = headersData.map(function (h) {
            var n = (h.nivel === '1' || h.nivel === 1) ? 1 : (h.nivel === '2' || h.nivel === 2) ? 2 : 3;
            var size = (n === 1 ? 16 : n === 2 ? 12 : 10);
            var texto = h.titulo || h.nombre || '';
            return '<p align="center"><font size="' + size + '"><b>' + xmlEscape(texto) + '</b></font></p>';
          }).join('');

          // --- Parámetros de diseño ---
          const MAX_COLS_PER_PAGE = 10; // columnas por hoja
          const FILAS_POR_PAGINA = 25;  // filas por hoja

          const totalCols = cols.length;
          const totalFilas = registros.length;

          const totalPagesCols = Math.ceil(totalCols / MAX_COLS_PER_PAGE);
          const totalPagesFilas = Math.ceil(totalFilas / FILAS_POR_PAGINA);

          let pagesHtml = '';

          // 🔹 Recorremos las filas primero (bloques de registros)
          for (let pageFila = 0; pageFila < totalPagesFilas; pageFila++) {
            const filaStart = pageFila * FILAS_POR_PAGINA;
            const filaEnd = Math.min(filaStart + FILAS_POR_PAGINA, totalFilas);

            // 🔹 Para cada bloque de filas, recorremos los grupos de columnas
            for (let pageIndex = 0; pageIndex < totalPagesCols; pageIndex++) {
              const startCol = pageIndex * MAX_COLS_PER_PAGE;
              const endCol = Math.min(startCol + MAX_COLS_PER_PAGE, totalCols);
              const subsetCols = cols.slice(startCol, endCol);
              const subsetSelected = selected.slice(startCol, endCol);

              // --- Cabecera de columnas ---
              const colTitles = '<tr>' + subsetCols.map(c =>
                '<td align="center"><b>' + xmlEscape(c.label || c.name || 'Columna') + '</b></td>'
              ).join('') + '</tr>';

              // --- Filas de datos ---
              let pdfRows = '';
              for (let r = filaStart; r < filaEnd; r++) {
                const result = registros[r];
                pdfRows += '<tr>';
                for (let c = 0; c < subsetSelected.length; c++) {
                  const val = subsetSelected[c];
                  const v = result.split(delimiterCampos)[val];
                  pdfRows += '<td>' + xmlEscape(v) + '</td>';
                }
                pdfRows += '</tr>';
              }

              // --- Salto de página (excepto la primera)
              if (pageIndex > 0 || pageFila > 0) pagesHtml += '<pbr/>';

              // --- Construcción completa de la hoja ---
              pagesHtml +=
                '<page size="A4-landscape" margin="0.5in">' +
                encabezadosHTML +
                '<table border="1" width="100%" cellpadding="3" cellspacing="0">' +
                colTitles + pdfRows +
                '</table>' +
                '</page>';
            }
          }

          // --- Plantilla XML del PDF ---
          const pdfXml =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<pdf>' +
            '  <head>' +
            '    <macrolist>' +
            '      <macro id="footer">' +
            '        <p align="center"><font size="8">Página <pagenumber/> de <totalpages/></font><br/>' +
            '        <font size="7"></font></p>' +
            '      </macro>' +
            '    </macrolist>' +
            '  </head>' +
            '  <body footer="footer" font-size="9" size="A4-landscape">' +
            pagesHtml +
            '  </body>' +
            '</pdf>';

          const TEMP_FOLDER_ID = -15;

          const pdfFile = render.xmlToPdf({ xmlString: pdfXml });
          pdfFile.name = `ExportBusqueda_${searchId}` + new Date() + `.pdf`;
          pdfFile.folder = TEMP_FOLDER_ID;
          pdfFile.isOnline = true;

          const fileId = pdfFile.save();
          const savedPdf = file.load({ id: fileId });

          const redirectUrl = url.resolveScript({
            scriptId: runtime.getCurrentScript().id,
            deploymentId: runtime.getCurrentScript().deploymentId
          });

          res.write(`
            <html>
              <script>
                window.open("${savedPdf.url}", "_blank");
                window.location.href = "${redirectUrl}";
              </script>
            </html>
          `);
        }
      }
    } catch (error) {
      log.error('Error en el MAIN ', error);
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
  
  function limpiarValor(valor) {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'number') return valor.toFixed(2);

    const val = valor.toString().trim();

    // Si es ".00", ".", o vacío → devolver "0.00"
    if (val === '.00' || val === '.' || val === '') return '0.00';

    if (val === '- None -' || val === 'null' || val === '- none -') return ' ';

    // Si es número válido con punto decimal → mantener
    if (!isNaN(val) && val !== '') {
      const num = parseFloat(val);
      if (Number.isFinite(num)) return num.toFixed(2);
    }

    // Si es texto o no numérico → dejar igual
    return val;
  }

  function limpiarValorEspe(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor.toString() : valor.toFixed(2);

  const val = valor.toString().trim();

  // Si es ".00", ".", o vacío → devolver "0.00"
  if (val === '.00' || val === '.' || val === '') return '0.00';

  if (val === '- None -' || val === 'null' || val === '- none -') return ' ';

  // Si es número válido con punto decimal → mantener
  if (!isNaN(val) && val !== '') {
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      // Si el número es entero → devolver sin decimales
      return Number.isInteger(num) ? num.toString() : num.toFixed(2);
    }
  }

  // Si es texto o no numérico → dejar igual
  return val;
}

  return { onRequest };
});
