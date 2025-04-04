/**
 * @NApiVersion 2.1
 *@NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/configuration.json
 *
 */
define(["N/runtime", "N/email", "N/file", "3K/utilities", "N/render", "N/search", "N/format", "N/url", "N/record", "./LIB - Busquedas.js"], (runtime, email, file, utilities, render, search, format, url, record, libBusquedas) => {

    const resultsNumber = 1000; 
    let fileID = "";
    let contador = 1;

    const getInputData = () => {
        const nameProcess= "GET INPUT DATA";
        const parametros = getParameters();
        let arrResult = new Array();
        const fechaProceso = new Date();
        const dateRange = getRangePeriod(parametros.periodo);
        const templateName = `ATS_${formatMonth(dateRange.month)}${dateRange.anio}${parametros.subsidiaria || ""}`;

        let respuesta = {
            compras: new Array(),
            ventas: new Array(),
            anuladas: new Array(),
            exportaciones: new Array()
        };

        try {
            let archivos = parametros.archivos;
            archivos = archivos.split(",");

            for(var i = 0; i < archivos.length; i++){
                    
                var idFile = archivos[i];

                if (!utilities.isEmpty(idFile)) {
                    log.audit("GetInputData - Archivo", "idFile: " + idFile);
            
                    var fileResult = file.load({
                        id: idFile
                    });

                    var contentFile = fileResult.getContents();
                    var jsonFile = JSON.parse(contentFile);
                    log.audit("Archivo TXT", "Archivo TXT contiene Info: " + !utilities.isEmpty(jsonFile));
                    log.audit("Archivo TXT", "Archivo TXT contiene Info: " + JSON.stringify(jsonFile));

                    if(!utilities.isEmpty(jsonFile.data.ventas)){
                        const a = jsonFile.data.ventas;
                        respuesta.ventas = respuesta.ventas.concat(a); 
                        arrResult = arrResult.concat(a)
                    }else if(!utilities.isEmpty(jsonFile.data.compras)){
                        const a = jsonFile.data.compras;
                        respuesta.compras = respuesta.compras.concat(a); 
                        arrResult = arrResult.concat(a)
                    }else if(!utilities.isEmpty(jsonFile.data.anuladas)){
                        const a = jsonFile.data.anuladas;
                        respuesta.anuladas = respuesta.anuladas.concat(a); 
                        arrResult = arrResult.concat(a)
                    }else if(!utilities.isEmpty(jsonFile.data.exportaciones)){
                        const a = jsonFile.data.exportaciones;
                        respuesta.exportaciones = respuesta.exportaciones.concat(a);
                        arrResult = arrResult.concat(a) 
                    }

                }
                     
            }
            log.audit("LENGHT VENTAS", respuesta.ventas.length)
            log.audit("LENGHT COMPRAS", respuesta.compras.length)
            log.audit("LENGHT ANULADAS", respuesta.anuladas.length)
            log.audit("LENGHT EXPORTACIONES", respuesta.exportaciones.length)
            return arrResult;
        } catch (error) {
            log.error(nameProcess, "Error: " + error);
            handleError(nameProcess, error, parametros, templateName, fechaProceso);
        }
    }

    const map = (context) => {
        const FN = 'map';
        const parametros = getParameters();
        const fechaProceso = new Date();
        const dateRange = getRangePeriod(parametros.periodo);
        const templateName = `ATS_${formatMonth(dateRange.month)}${dateRange.anio}${parametros.subsidiaria || ''}`;
        try {
            let key= "";
            const resultado = JSON.parse(context.value);

            if (resultado) {

                if(Object.keys(resultado).length == 55){
                    key = "compras"
                }
                if(Object.keys(resultado).length == 26){
                    key = "ventas"
                }
                if(Object.keys(resultado).length == 6){
                    key = "anuladas"
                }
                if(Object.keys(resultado).length == 32){
                    key = "exportaciones"
                }

                if (key != "") {
                    context.write(key, JSON.stringify(resultado));
                }
            }
            //const currentTime = fechaProceso.toLocaleString(); 
            //log.debug(FN, `Terminó ${FN} con éxito: ${currentTime}`); 
        } catch (e) {
            handleError(FN, e, parametros, templateName, fechaProceso);
        }
    };

    // const reduce = (context) => {
    //     const FN = 'reduce';
    //     const parametros = getParameters();
    //     const fechaProceso = new Date();
    //     const objConfigATS = getConfigurationATS(parametros.subsidiaria);
    //     const objCompany = getCompanyConfiguration(parametros.subsidiaria);
    //     const dateRange = getRangePeriod(parametros.periodo);
    //     const templateName = `ATS_${formatMonth(dateRange.month)}${dateRange.anio}${parametros.subsidiaria || ''}`;

    //     try {
    //         const resultado = JSON.parse(context.values);
    //         let objToReduce = { data: resultado };

    //         if (objToReduce.data.ventas.length > 0 || objToReduce.data.compras.length > 0 || objToReduce.data.anuladas.length > 0 || objToReduce.data.exportaciones.length > 0) {
    //             objCompany.mes = formatMonth(dateRange.month);
    //             objCompany.anio = dateRange.anio;
    //             objCompany.regimenMicroempresa = parametros.regimenSemestral === 'T' ? 'SI' : '';

    //             objToReduce.inforA = objCompany;

    //             const fileId = generateXml(objConfigATS.idTemplateAts, objToReduce, templateName, objConfigATS);

    //             if (fileId) {
    //                 const mensaje = 'Archivo XML generado exitosamente';
    //                 log.debug('fileId',fileId);
    //                  const idLogGeneral = grabarLogGeneral(parametros.periodo, parametros.subsidiaria, parametros.usuarioId, mensaje, fileId, parametros.estadoOk, fechaProceso);
    //                 const currentTime = fechaProceso.toLocaleString(); 
    //                 log.debug(FN, `Terminó ${FN} con éxito: ${currentTime}. ${mensaje} - Registro: ${idLogGeneral}, fileId: ${fileId}`); 
    //                 enviarMail(fileId, parametros.usuarioId, idLogGeneral, templateName); 
    //             }

    //         } else {
    //             const mensaje = 'No se encontraron transacciones a informar en el XML.';
    //             const idLogGeneral = grabarLogGeneral(parametros.periodo, parametros.subsidiaria, parametros.usuarioId, mensaje, '', parametros.estadoOk, fechaProceso);
    //             enviarMail('', parametros.usuarioId, idLogGeneral, templateName);
    //         }

    //     } catch (e) {
    //         handleError(FN, e, parametros, templateName, fechaProceso);
    //     }
    // };

    const summarize = (summary) => {
        const nameProcess= "SUMMARIZE";
        const parametros = getParameters();
        const fechaProceso = new Date();
        const objConfigATS = getConfigurationATS(parametros.subsidiaria);
        const objCompany = getCompanyConfiguration(parametros.subsidiaria);
        const dateRange = getRangePeriod(parametros.periodo);
        const templateName = `ATS_${formatMonth(dateRange.month)}${dateRange.anio}${parametros.subsidiaria || ""}`;

        let arrSummarize = {};

        let resultado = {
            compras: new Array(),
            ventas: new Array(),
            anuladas: new Array(),
            exportaciones: new Array()
        }
        try {
            summary.output.iterator().each(function(key, value){

                var obj = JSON.parse(value);
                resultado[key].push(obj);
                return true;
            });
            arrSummarize.data = resultado;
            log.audit(nameProcess,"Longitud Compras: " + arrSummarize.data.compras.length);
            log.audit(nameProcess,"Longitud Ventas: " + arrSummarize.data.ventas.length);
            log.audit(nameProcess,"Longitud Anuladas: " + arrSummarize.data.anuladas.length);
            log.audit(nameProcess,"Longitud Exportaciones: " + arrSummarize.data.exportaciones.length);
            
            if (arrSummarize.data.ventas.length > 0 || arrSummarize.data.compras.length > 0 || arrSummarize.data.anuladas.length > 0 || arrSummarize.data.exportaciones.length > 0) {
                objCompany.mes = formatMonth(dateRange.month);
                objCompany.anio = dateRange.anio;
                objCompany.regimenMicroempresa = parametros.regimenSemestral === "T" ? "SI" : "";

                arrSummarize.inforA = objCompany;

                const fileId = generateXml(objConfigATS.idTemplateAts, arrSummarize, templateName, objConfigATS);

                if (fileId) {
                    const mensaje = "Archivo XML generado exitosamente";
                    log.audit("fileId",fileId);
                     const idLogGeneral = grabarLogGeneral(parametros.periodo, parametros.subsidiaria, parametros.usuarioId, mensaje, fileId, parametros.estadoOk, fechaProceso);
                    const currentTime = fechaProceso.toLocaleString(); 
                    log.audit(nameProcess, `Terminó ${nameProcess} con éxito: ${currentTime}. ${mensaje} - Registro: ${idLogGeneral}, fileId: ${fileId}`); 
                    enviarMail(fileId, parametros.usuarioId, idLogGeneral, templateName); 
                }

            }
        } catch (error) {
            log.error(nameProcess, error.message);
            handleError(nameProcess, error, parametros, templateName, fechaProceso);
        }  
    }


    const getParameters = () => {
        const script = runtime.getCurrentScript();
    
        return {
            regimenSemestral: script.getParameter({ name: "custscript_l593_ats_generador_xml_reg" }),
            subsidiaria: script.getParameter({ name: "custscript_l593_ats_generador_xml_sub" }),
            periodo: script.getParameter({ name: "custscript_l593_ats_generador_xml_per" }),
            folderATS: script.getParameter({ name: "custscript_l593_ats_generador_xml_folder" }),
            estadoOk: script.getParameter({ name: "custscript_l593_ats_generador_xml_est_ok" }),
            estadoError: script.getParameter({ name: "custscript_l593_ats_generador_xml_error" }),
            usuarioId: script.getParameter({ name: "custscript_l593_ats_generador_xml_user" }),
            archivos: script.getParameter({ name: "custscript_l593_ats_generador_xml_files" })
        };
    };

    const getRangePeriod = (idPeriod) => {
        let infoPeriodo = search.lookupFields({
            type: "accountingperiod",
            id: idPeriod,
            columns: ["periodname"]
        });
        let periodname = infoPeriodo.periodname

        const monthseng = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };

        const monthspanish = {
            Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
            Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
            ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
            jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
        }

        const [monthStr, yearStr] = periodname.split(" ");
        let monthIndex = "";
        monthIndex = monthseng[monthStr];
        if (utilities.isEmpty(monthIndex)) {
            monthIndex = monthspanish[monthStr]
        }
        const year = parseInt(yearStr);
        let startDate = new Date(year, monthIndex - 5, 1);
        let endDate = "";
        if (monthIndex == 11) {
            endDate = new Date(year, monthIndex, 31);
        } else {
            endDate = new Date(year, monthIndex, 30);
        }

        let startDateFormat = dateFormatPreference(startDate);
        let endDateFormat = dateFormatPreference(endDate);
        return { start: startDateFormat, end: endDateFormat, anio: year, month: monthIndex + 1 };
    }

    const dateFormatPreference = (fecha) => {
        const userDateFormat = runtime.getCurrentUser().getPreference("DATEFORMAT");
        let fechaFormateada = format.format({
            value: fecha,
            type: format.Type.DATE,
            format: userDateFormat
        });
        return fechaFormateada
    }

    const formatMonth = (month) => {
        return month < 10 ? `0${month}` : `${month}`;
    };

    const buildFilters = (parametros, dateRange) => {
        let filtros = [];
        if (!utilities.isEmpty(parametros.subsidiaria)) {
            filtros.push({
                name: "subsidiary",
                operator: "ANYOF",
                values: parametros.subsidiaria
            });
        }
        if (parametros.regimenSemestral === "T") {
            // Semestral
            let internalIds = getPeriodId(dateRange.start, dateRange.end);
            let formulaPeriod = generarFormula(internalIds);
            filtros.push({
                name: "formulatext",
                operator: "IS",
                values: "1",
                formula: formulaPeriod
            });
        } else {
            // Mensual
            filtros.push({
                name: "postingperiod",
                operator: "EQUALTO",
                values: parametros.periodo
            });
        }
        return filtros;
    };

    /**
     * Genera y guarda uno o más archivos XML basados en el tamaño máximo permitido.
     * @param {number} templateFileId - ID del archivo de plantilla.
     * @param {Object} arrSummarize - Datos a incluir en la plantilla.
     * @param {string} templateName - Nombre base para los archivos generados.
     * @param {Object} objConfigATS - Configuración adicional (incluye ID de carpeta).
     * @returns {Array<number>} - IDs de los archivos creados.
     */
    function generateXml(templateFileId, arrSummarize, templateName, objConfigATS) {
        const MAX_FILE_SIZE_MB = 10;
        const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

        // Cargar plantilla y configurar renderizador
        const templateFile = file.load({ id: templateFileId });
        const xmlContent = render.create();
        xmlContent.templateContent = templateFile.getContents();

        // Añadir datos personalizados
        xmlContent.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: "infoC",
            data: arrSummarize
        });

        // Generar contenido XML
        const generatedXml = xmlContent.renderAsString();
        log.debug("generatedXml",generatedXml);
        // Dividir contenido en partes si es necesario
        const chunks = splitContentIntoChunks(generatedXml, MAX_FILE_SIZE_BYTES);

        // Crear archivos y guardar
        let fileIds = [];
        chunks.forEach((chunk, index) => {
            const fileName = chunks.length > 1 
                ? `${templateName}_part${index + 1}.xml`
                : `${templateName}.xml`;

            const xmlFile = file.create({
                name: fileName,
                fileType: file.Type.XMLDOC,
                contents: chunk,
                folder: objConfigATS.idCarpeta
            });

            fileIds.push(xmlFile.save());
        });

        return fileIds; // Retornar IDs de los archivos generados
    }

    const getConfigurationATS = (idSubsidiaria) => {

        let filtroSubsidiaria = {};
        if (!utilities.isEmpty(idSubsidiaria)) {
            filtroSubsidiaria.name = "custrecord_l593_panel_gen_subsidiaria";
            filtroSubsidiaria.operator = "IS";
            filtroSubsidiaria.values = idSubsidiaria;
        }

        const objResultSetConfigATS = utilities.searchSavedPro("customsearch_l593_conf_panel_gen_ats", filtroSubsidiaria);
        const { result: resultSetConfigATS, search: resultSearchConfigATS } = objResultSetConfigATS.objRsponseFunction;

        if (!utilities.isEmpty(resultSetConfigATS) && resultSetConfigATS.length > 0) {
            return {
                idCarpeta: resultSetConfigATS[0].getValue({ name: resultSearchConfigATS.columns[0] }),
                idTemplateAts: resultSetConfigATS[0].getValue({ name: resultSearchConfigATS.columns[1] })
            };
        }

        return {};
    };

    const getCompanyConfiguration = (idSubsidiaria) => {

        let { InitSearch } = libBusquedas;
        InitSearch = new InitSearch();

        log.audit("idSubsidiaria",idSubsidiaria)
        if (!utilities.isEmpty(idSubsidiaria)) {
            var filters = InitSearch.getFilter("custrecord_l593_conf_emp_subsidiaria", "ANYOF", idSubsidiaria)
        }
        log.audit("filters", JSON.stringify(filters))
        var savedSearch = search.load({
            id: "customsearch_l593_indent_infor_ats"
        });

        savedSearch.filters.push(filters);
        
        let resultCount = savedSearch.runPaged().count;

        if (resultCount != 0) {
            let result = savedSearch.run().getRange({ start: 0, end: 1 });
            return {
                IdInformante: result[0].getValue({ name: savedSearch.columns[0] }),
                razonSocial: result[0].getValue({ name: savedSearch.columns[1] }),
                anio: result[0].getValue({ name: savedSearch.columns[2] }),
                mes: result[0].getValue({ name: savedSearch.columns[3] }),
                regimenMicroempresa: result[0].getValue({ name: savedSearch.columns[4] }),
                numEstabRuc: result[0].getValue({ name: savedSearch.columns[5] }),
                codigoOperativo: result[0].getValue({ name: savedSearch.columns[6] })
            };
        } else {
            log.error("No cuenta con un registro en el record TK - Información Adicional con el mismo país");
            // Retornar un objeto vacío si no se encontraron resultados
            return {};
        }

    };

    const grabarLogGeneral = (periodo, subsidiaria, usuario, detalleProceso, archivos, estadoProceso, fechaProceso) => {
        const userTimezone = runtime.getCurrentUser().getPreference("TIMEZONE");
    
        // Convertir la fecha a la zona horaria del usuario
        const fechaLocalDate = format.parse({
            value: fechaProceso,
            type: format.Type.DATETIME,
            timezone: userTimezone
        });
    
        // Crear registro del log
        const registroLogGeneral = record.create({type: "customrecord_l593_gen_xml_loc_log", isDynamic: true});
    
        // Mapear valores a los campos del registro
        const fieldMap = {
            "custrecord_l593_gen_xml_loc_log_fecha": fechaLocalDate,
            "custrecord_l593_gen_xml_loc_log_periodo": periodo,
            "custrecord_l593_gen_xml_loc_log_subsidia": subsidiaria,
            "custrecord_l593_gen_xml_loc_log_usuario": usuario,
            "custrecord_l593_gen_xml_loc_log_detalle": detalleProceso,
            "custrecord_l593_gen_xml_loc_log_estado": estadoProceso
        };
    
        Object.entries(fieldMap).forEach(([fieldId, value]) => {
            if (!utilities.isEmpty(value)) {
                registroLogGeneral.setValue({ fieldId, value });
            }
        });
    
        // Procesar el array de archivos
        if (archivos && archivos.length > 0) {
            archivos.forEach(fileId => {
                registroLogGeneral.selectNewLine({ sublistId: "mediaitem" });
                registroLogGeneral.setCurrentSublistValue({
                    sublistId: "mediaitem",
                    fieldId: "mediaitem",
                    value: fileId
                });
                registroLogGeneral.commitLine({ sublistId: "mediaitem" });
            });
        }
    
        // Guardar el registro
        const idRecordSave = registroLogGeneral.save();
    
        return idRecordSave;
    };

    const enviarMail = (archivo, idUsuario, idLogGeneral, nombreArchivo, mensaje) => {
        try {
            const author = idUsuario;
            const recipients = idUsuario;
            const subject = "EC - Generación XML Anexo Transaccional Simplificado - Resultado del proceso";
    
            const esquema = "https://";
            const host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            const rutaRelativa = url.resolveRecord({
                recordType: "customrecord_l593_gen_xml_loc_log",
                recordId: idLogGeneral,
                isEditMode: false
            });
    
            const urlRT = esquema + host + rutaRelativa;
    
            let body;
    
            if (!utilities.isEmpty(archivo) && utilities.isEmpty(mensaje)) {
                body = `La Generación del archivo ${nombreArchivo} ha finalizado, puede verificar el resultado en el siguiente enlace: <a href="${urlRT}"> EC-Generación XML LOC - Log  </a>  <br> Se adjuntan los archivos XML generados.`;
            } else if (utilities.isEmpty(archivo) && utilities.isEmpty(mensaje)) {
                body = `No se encontraron transacciones a informar para el archivo ${nombreArchivo}, puede verificar el resultado en el siguiente enlace: <a href="${urlRT}"> EC-Generación XML LOC - Log  </a>`;
            } else if (utilities.isEmpty(archivo) && !utilities.isEmpty(mensaje)) {
                body = `Ocurrió un error generando el archivo ${nombreArchivo}, descripción del error: ${mensaje}, puede verificar el resultado en el siguiente enlace: <a href="${urlRT}"> EC-Generación XML LOC - Log  </a>`;
            }
    
            // Cargar los archivos y agregarlos como adjuntos
            const adjunto = !utilities.isEmpty(archivo) && Array.isArray(archivo)
                ? archivo.map(fileId => file.load({ id: fileId }))
                : null;
            log.audit("adjunto", adjunto)
            // Enviar el correo
            if(adjunto.length > 2){
                adjunto.forEach(element => {
                    email.send({
                        author,
                        recipients,
                        subject,
                        body,
                        attachments: [element]
                    });
                });
            }else{
                email.send({
                    author,
                    recipients,
                    subject,
                    body,
                    attachments: adjunto
                });
            }
            
    
        } catch (e) {
            log.error("enviarMail", `Exception: ${e.message}`);
        }
    };

    /**
     * Calcula el tamaño en bytes de una cadena en UTF-8.
     * @param {string} str - La cadena a medir.
     * @returns {number} - El tamaño en bytes.
     */
    function getUtf8ByteSize(str) {
        let size = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 0x80) {
                size += 1;
            } else if (code < 0x800) {
                size += 2;
            } else if (code < 0x10000) {
                size += 3;
            } else {
                size += 4;
            }
        }
        return size;
    }

    /**
     * Divide una cadena en partes más pequeñas.
     * @param {string} content - El contenido a dividir.
     * @param {number} maxBytes - Tamaño máximo en bytes por parte.
     * @returns {Array<string>} - Partes del contenido dividido.
     */
    function splitContentIntoChunks(content, maxBytes) {
        const totalSize = getUtf8ByteSize(content);
        log.debug("totalSize",totalSize);
        if (totalSize <= maxBytes) return [content];

        const parts = Math.ceil(totalSize / maxBytes);
        const chunkSize = Math.floor(content.length / parts);

        let chunks = [];
        for (let i = 0; i < parts; i++) {
            const start = i  * chunkSize;
            const end = i === parts - 1 ? content.length : start + chunkSize;
            chunks.push(content.substring(start, end));
        }

        return chunks;
    }

    function lengthInUtf8Bytes(str) {
        var m = encodeURIComponent(str).match(/%[89ABab]/g);
        return str.length + (m ? m.length : 0);
    }

    const handleError = (context, e, parametros, templateName, fechaProceso) => {
        const mensaje = `${context} - ${e.message || `Unexpected error`}`;
        log.error({
            title: `${context} error`,
            details: { message: mensaje },
        });
        const idLogGeneral = grabarLogGeneral(parametros.periodo, parametros.subsidiaria, parametros.usuarioId, mensaje, '', parametros.estadoError, fechaProceso);
        enviarMail('', parametros.usuarioId, idLogGeneral, templateName, mensaje);
        throw { message: mensaje };
    };

    const getPeriodId = (fechaInicio, fechaFin) => {
        let busqueda = search.create({
            type: "accountingperiod",
            filters:
                [
                    ["isyear", "is", "F"],
                    "AND",
                    ["isquarter", "is", "F"],
                    "AND",
                    ["startdate", "onorafter", fechaInicio],
                    "AND",
                    ["enddate", "onorbefore", fechaFin]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        sort: search.Sort.ASC,
                        label: "Internal ID"
                    }),
                ]

        })
        let searchResult = busqueda.run().getRange({ start: 0, end: 100 });

        let internalIds = [];
        searchResult.forEach(function (result) {
            internalIds.push(result.getValue('internalid'));
        });

        return internalIds
    }

    const generarFormula = (idsPeriod) => {
        var cant = idsPeriod.length;
        var comSimpl = "'";
        var strinic = "CASE WHEN ({postingperiod.id}=" + comSimpl + idsPeriod[0] + comSimpl;
        var strAdicionales = "";
        var strfinal = ") THEN 1 ELSE 0 END";
        for (var i = 1; i < cant; i++) {
            strAdicionales += " or {postingperiod.id}=" + comSimpl + idsPeriod[i] + comSimpl;
        }
        var str = strinic + strAdicionales + strfinal;
        return str;
    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    }
});

