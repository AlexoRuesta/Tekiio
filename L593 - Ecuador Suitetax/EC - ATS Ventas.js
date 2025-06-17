/**
 * @NApiVersion 2.1
 *@NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/configuration.json
 *
 */
define(["N/runtime", "N/email", "N/file", "3K/utilities", "N/render", "N/search", "N/format", "N/url", "N/record", "./LIB - Busquedas.js", "N/task"], (runtime, email, file, utilities, render, search, format, url, record, libBusquedas, task) => {

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

        let { InitSearch } = libBusquedas;
        InitSearch = new InitSearch();

        try {
            log.audit("parametros", JSON.stringify(parametros))
            const filtros = buildFilters(parametros, dateRange);
            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.operator, n.values, n.formula))
            //let filters = [];
          
            const savedSearch = search.load({
                id: "customsearch_l593_ventas_ats"
            });

            savedSearch.filters.push(...filters);

            //for (let thread = 1; thread < 10 ; thread++) {

            let a = Number(parametros.rellamado); 
            for (let thread = a; thread <= a + 9 ; thread++) {
                let end = resultsNumber*thread,
                start = end - resultsNumber; 
                log.audit("Tamanio", start + ' --- ' + end)

                let searchResults = savedSearch.run().getRange({
                    start: start,
                    end: end
                });
                
                arrResult = arrResult.concat(searchResults);
            }


            log.audit({
                title: 'Resultados de la Búsqueda',
                details: 'Se han obtenido ' + arrResult.length + ' resultados.'
            });

            
            log.audit("filtros",savedSearch.filters);
            
            return arrResult;
        } catch (error) {
            log.error(nameProcess, "Error: " + error);
            handleError(nameProcess, error, parametros, templateName, fechaProceso);
        }
    }

    const map = (context) => {
        let objMap = new Object();

        try {
            var result = JSON.parse(context.value);
            log.debug("result", JSON.stringify(result));

            objMap["tpIdCliente"] = result.values["MAX(formulatext)"];
            objMap["idCliente"] = result.values["MAX(formulatext)_1"];
            objMap["parteRel"] = result.values["MAX(formulatext)_2"];
            objMap["tipoCliente"] = result.values["MAX(formulatext)_3"];
            objMap["DenoCli"] = result.values["MAX(formulatext)_4"];
            objMap["tipoComprobante"] = result.values["MAX(formulatext)_5"];
            objMap["tipoEm"] = result.values["MAX(formulatext)_6"];
            objMap["numeroComprobantes"] = result.values["SUM(formulanumeric)"];
            objMap["baseNoGraIva"] = result.values["SUM(formulacurrency)"];
            objMap["baseImponible"] = result.values["SUM(formulacurrency)_1"];
            objMap["baseImpGrav"] = result.values["SUM(formulacurrency)_2"];
            objMap["montoIva"] = result.values["SUM(formulacurrency)_3"];
            objMap["tipoCompe"] = result.values["MAX(formulatext)_7"];
            objMap["monto"] = result.values["MAX(formulatext)_8"];
            objMap["montoIce"] = result.values["MAX(formulatext)_9"];
            objMap["valorRetIva"] = result.values["MAX(formulatext)_10"];
            objMap["valorRetRenta"] = result.values["MAX(formulatext)_11"];
            objMap["formaPago"] = result.values["MAX(formulatext)_12"];
            objMap["codEstab"] = result.values["MAX(formulatext)_13"];
            objMap["ventasEstab"] = result.values["SUM(formulacurrency)_4"];
            objMap["ivaComp"] = result.values["MAX(formulatext)_14"];
            objMap["tipoComp"] = result.values["GROUP(custbody_l593_tipo_comprobante)"][0].value;
            objMap["establecimiento"] = result.values["GROUP(custbody_l593_establecimiento)"][0].value;
            objMap["periodo"] = result.values["GROUP(postingperiod)"][0].value;
            objMap["customer"] = result.values["GROUP(customer.internalid)"][0].value;
            objMap["tipoSS"] = 1;

            context.write(context.key, objMap);
        } catch (error) {
            log.error("ERROR MAP", error.message);
            log.debug("ERROR MAP", error.message);
            //log.error("MAP " + context.key + " - Excepcion", "Mensaje error: " + error.message + ", key: " + clave);
        }
    }

    const summarize = (summary) => {
        const nameProcess= "SUMMARIZE";
        const parametros = getParameters();
        const fechaProceso = new Date();
        const objConfigATS = getConfigurationATS(parametros.subsidiaria);
        const dateRange = getRangePeriod(parametros.periodo);
        const templateName = `ATS_${formatMonth(dateRange.month)}${dateRange.anio}${parametros.subsidiaria || ""}`;
        
        let arrSummarize = {};
        let resultado = {
            ventas: new Array()
        }

        try {
            log.debug("SUMMARIZE INFO - GetInputData Report", JSON.stringify(summary.inputSummary));
            log.debug("SUMMARIZE INFO - Map Report", JSON.stringify(summary.mapSummary));

            summary.output.iterator().each(function(key, value){

                var obj = JSON.parse(value);
                resultado.ventas.push(obj);
                return true;
            });
            arrSummarize.data = resultado;
            log.audit("tamanio",JSON.stringify(arrSummarize));
            log.audit("tamanio",arrSummarize.data.ventas.length);
            
            let tamanio =  arrSummarize.data.ventas.length;
            let idUsuario = runtime.getCurrentUser().id;

            if (arrSummarize.data.ventas.length > 0 ) {

                saveTxt(arrSummarize); 
                
                function saveTxt(objSummarize){
                    let arrSummarize_1 = {
                            data : {
                                ventas: new Array()
                            }
                        },
                        arrSummarize_2 = {
                            data : {
                                ventas: new Array()
                            }
                        }
                    var objRespuesta = JSON.stringify(objSummarize); 
                    log.debug("objRespuesta",objRespuesta)
                    log.debug("objRespuesta lengt",(objSummarize.data.ventas).length)
                    var cantidadBytes = lengthInUtf8Bytes(objRespuesta);
                    log.debug("Peso en byte","Peso en bytes iteracion "+cantidadBytes);
    
                    if(cantidadBytes < 10000000){
                        const auxFecha = new Date();
                        let savedFile = file.create({
                            name: "ATS_Ventas_auxiliar_"  + contador  + auxFecha,
                            fileType: file.Type.PLAINTEXT,
                            contents: objRespuesta,
                            folder: objConfigATS.idCarpeta
                        });
                        contador ++
                        parametros.archivos = parametros.archivos + savedFile.save() + ",";
                        //fileID = fileID + savedFile.save() + ",";
                        log.audit("fileID",  parametros.archivos)
                    }else{
                        let resultado = objSummarize.data.ventas,
                            mitad = Math.ceil(resultado.length / 2),
                            primeraMitad = resultado.slice(0, mitad),
                            segundaMitad = resultado.slice(mitad); 

                            log.debug("primeraMitad",primeraMitad)
                            log.debug("segundaMitad",segundaMitad)
                        arrSummarize_1.data.ventas = primeraMitad;
                        saveTxt(arrSummarize_1);
                        arrSummarize_2.data.ventas = segundaMitad;
                        saveTxt(arrSummarize_2);
                    }
                }

                if(tamanio%resultsNumber == 0){
                    var objParametros = {};
                        objParametros.custscript_l593_ats_ventas_subsidiaria = parametros.subsidiaria;
                        objParametros.custscript_l593_ats_ventas_periodo = parametros.periodo;
                        objParametros.custscript_l593_ats_ventas_usuario = idUsuario;
                        objParametros.custscript_l593_ats_ventas_regimen = parametros.regimenSemestral;
                        objParametros.custscript_l593_ats_ventas_rellamado = Number(parametros.rellamado) + 10;
                        objParametros.custscript_l593_ats_ventas_archivos = parametros.archivos;
                        objParametros.custscript_l593_ats_ventas_xml = parametros.xml;


                    var redirec = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_l593_ats_ventas',
                        deploymentId: 'customdeploy_l593_ats_ventas',
                        params: objParametros
                    });
                    redirec.submit();
                }else{
                    var objParametros = {};
                        objParametros.custscript_l593_ats_ventas_2_subsidiaria = parametros.subsidiaria;
                        objParametros.custscript_l593_ats_ventas_2_periodo = parametros.periodo;
                        objParametros.custscript_l593_ats_ventas_2_usuario = idUsuario;
                        objParametros.custscript_l593_ats_ventas_2_regimen = parametros.regimenSemestral;
                        objParametros.custscript_l593_ats_ventas_2_archivos = parametros.archivos;
                        objParametros.custscript_l593_ats_ventas_2_xml = parametros.xml;

                    var redirec = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_l593_ats_ventas_2',
                        deploymentId: 'customdeploy_l593_ats_ventas_2',
                        params: objParametros
                    });
                    redirec.submit();
                    log.audit("FINALIZO VENTAS")
                }

            } else {
                var objParametros = {};
                objParametros.custscript_l593_ats_ventas_2_subsidiaria = parametros.subsidiaria;
                objParametros.custscript_l593_ats_ventas_2_periodo = parametros.periodo;
                objParametros.custscript_l593_ats_ventas_2_usuario = idUsuario;
                objParametros.custscript_l593_ats_ventas_2_regimen = parametros.regimenSemestral;
                objParametros.custscript_l593_ats_ventas_2_archivos = parametros.archivos;
                objParametros.custscript_l593_ats_ventas_2_xml = parametros.xml;
                var redirec = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_l593_ats_ventas_2',
                    deploymentId: 'customdeploy_l593_ats_ventas_2',
                    params: objParametros
                });
                redirec.submit();
                log.audit("FINALIZO VENTAS SIN RESULTADOS")
            }
            
        } catch (error) {
            log.error(nameProcess, "Error: " + error);
            handleError(nameProcess, error, parametros, templateName, fechaProceso);
        }  
    }

    const getParameters = () => {
        const script = runtime.getCurrentScript();
    
        return {
            regimenSemestral: script.getParameter({ name: "custscript_l593_ats_ventas_regimen" }),
            subsidiaria: script.getParameter({ name: "custscript_l593_ats_ventas_subsidiaria" }),
            periodo: script.getParameter({ name: "custscript_l593_ats_ventas_periodo" }),
            folderATS: script.getParameter({ name: "custscript_l593_ats_ventas_folder" }),
            estadoOk: script.getParameter({ name: "custscript_l593_ats_ventas_estado_ok" }),
            estadoError: script.getParameter({ name: "custscript_l593_ats_ventas_estado_error" }),
            usuarioId: script.getParameter({ name: "custscript_l593_ats_ventas_usuario" }),
            rellamado: script.getParameter({ name: "custscript_l593_ats_ventas_rellamado" }),
            archivos: script.getParameter({ name: "custscript_l593_ats_ventas_archivos" }),
            xml: script.getParameter({ name: "custscript_l593_ats_ventas_xml" })
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

        let filtroCompany = {};

        if (!utilities.isEmpty(idSubsidiaria)) {
            filtroCompany.name = "custrecord_l593_conf_emp_subsidiaria";
            filtroCompany.operator = "IS";
            filtroCompany.values = idSubsidiaria;
        }

        const objResultSetCompanyConfig = utilities.searchSavedPro("customsearch_l593_indent_infor_ats", filtroCompany);
        const { result: resultSetCompanyConfig, search: resultSearchCompanyConfig } = objResultSetCompanyConfig.objRsponseFunction;

        if (!utilities.isEmpty(resultSetCompanyConfig) && resultSetCompanyConfig.length > 0) {
            const result = resultSetCompanyConfig[0]; 

            return {
                IdInformante: result.getValue({ name: resultSearchCompanyConfig.columns[0] }),
                razonSocial: result.getValue({ name: resultSearchCompanyConfig.columns[1] }),
                anio: result.getValue({ name: resultSearchCompanyConfig.columns[2] }),
                mes: result.getValue({ name: resultSearchCompanyConfig.columns[3] }),
                regimenMicroempresa: result.getValue({ name: resultSearchCompanyConfig.columns[4] }),
                numEstabRuc: result.getValue({ name: resultSearchCompanyConfig.columns[5] }),
                codigoOperativo: result.getValue({ name: resultSearchCompanyConfig.columns[6] })
            };
        }

        // Retornar un objeto vacío si no se encontraron resultados
        return {};
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
    
            // Enviar el correo
            email.send({
                author,
                recipients,
                subject,
                body,
                attachments: adjunto
            });
    
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
        summarize: summarize
    }
});

