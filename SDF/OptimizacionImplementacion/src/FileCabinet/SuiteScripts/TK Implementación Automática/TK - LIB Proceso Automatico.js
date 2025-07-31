    /**
     *@NApiVersion 2.1
    */
     define(["N/ui/serverWidget", "N/search", "N/format", "N/record"], function (serverWidget, search, format, record) {

        class Constant {
            constructor() {
                this.EMPTY_SELECT_VALUE = -1;
                this.PAGE_SIZE = 500;
            }

        }

        class Field {
            constructor(field) {
                this.field = field;
            }

            addSelectOption = (value, text, isSelected = null) => {
                this.field.addSelectOption({
                    value,
                    text,
                    isSelected
                });
            }

            updateDisplayType = (displayType) => {
                return this.field.updateDisplayType({ displayType });
            }

            updateLayoutType = (layaoutType) => {
                return this.field.updateLayoutType({ 
                    layoutType : layaoutType
                });
            }

            updateBreakType = (breakType) => {
                return this.field.updateBreakType({ 
                    breakType  : breakType
                });
            }

            setDefaultValue = (value) => {
                this.field.defaultValue = value;
            }

            getDefaultValue = () => {
                return this.field.defaultValue;
            }

            setMandatoryValue = (value) => {
                this.field.isMandatory =  value;
            }

            setDisabledValue = (value) => {
                this.field.isDisabled =  value;
            }
        }

        class SubList {
            constructor(sublist) {
                this.sublist = sublist;
            }

            addSublistField = (id, type, label, source = null) => {
                return new Field(this.sublist.addField({
                    id,
                    type,
                    label,
                    source
                }));
            }

            addSublistFieldHidden = (id, type, label, source = null) => {
                return new Field(this.sublist.addField({
                    id,
                    type,
                    label,
                    source
                }));//.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            }

            setSublistValue = (id, line, value) => {
                this.sublist.setSublistValue({
                    id,
                    line,
                    value
                });
            }

            addRefreshButton = () => {
                this.sublist.addRefreshButton();
            }

            addMarkAllButtons = () => {
                this.sublist.addMarkAllButtons();
            }
        }

        class UserInterface {
            constructor() {
                this.FORM = null;
                this.FIELDS_NAME = this.getFormFieldsName();
                this.FIELDS_ID = this.getFormFieldsId();
                this.CONSTANT = new Constant();
            }

            init = () => {
                log.debug("Inicio CLASS");
            }

            createForm = (formName) => {
                this.FORM = serverWidget.createForm(formName);
            }

            addSubmitButton = (name) => {
                this.FORM.addSubmitButton(name);
            }

            addField = (id, type, label, container = null, source = null) => {
                return new Field(this.FORM.addField({
                    id,
                    type,
                    label,
                    container,
                    source
                }));
            }

            addTab = (id, label) => {
                this.FORM.addTab({
                    id,
                    label
                });
            }

            addSubtab = (id, label, tab) => {
                this.FORM.addSubtab({
                    id,
                    label,
                    tab
                });
            }

            addSublist = (id, type, label, tab) => {
                return new SubList(this.FORM.addSublist({
                    id,
                    type,
                    label,
                    tab
                }));
            }

            addButton = (id, label, functionName) => {
                this.FORM.addButton({
                    id,
                    label,
                    functionName
                });
            }

            addFieldGroup = (id, label) => {
                return this.FORM.addFieldGroup({
                    id, label
                });
            }

            getValuesSubsidiary = (subsidiaryID) => {
                let customSub =  record.load({ type: "subsidiary", id: subsidiaryID});
                return {
                    ruc: customSub.getValue("federalidnumber"),
                    razonSocial: customSub.getValue("legalname"),
                    direccion: customSub.getValue("mainaddress_text"), 
                    remitente: customSub.getValue("legalname")
                }
            }

            getFormFieldsName = () => {
                return {
                    form: {
                    },
                    fieldgroup: {
                    },
                    field: {
                        page: "Indice de Pagina",
                    },
                    sublist: {
                    },
                    sublistfield: {
                    },
                    button: {
                    }
                }
            }

            getFormFieldsId = () => {
                return {
                    fieldgroup: {
                    },
                    field: {
                        proyect: "custpage_f_proyect",
                        account: "custpage_f_account",
                        page: "custpage_f_page",
                        functions: "custpage_f_functions"
                    },
                    sublist: {
                        results: "custpage_sl_results"
                    },
                    sublistfield: {
                    }
                }
            }

            setResultSubListData = (resultSubList, defaultValues, pageField) => {
                let customSearch = search.load({ id: "customsearch_tk_search_configuration" }); // Configuración Records Search	
 
                if (defaultValues.configuration) customSearch.filters.push(this.createFilter("custrecord_tk_configuration_import_paren", search.Operator.IS, defaultValues.configuration));
                
                let pagedData = customSearch.runPaged({ pageSize: this.CONSTANT.PAGE_SIZE });
                let resultTotalNumber = pagedData.count;
                log.debug("resultTotalNumber",resultTotalNumber)
                if (resultTotalNumber) {
                    //let pageField = this.addField(this.FIELDS_ID.field.page, serverWidget.FieldType.SELECT, this.FIELDS_NAME.field.page, this.FIELDS_ID.fieldgroup.results);
                    let pagedCount = Math.ceil(resultTotalNumber / this.CONSTANT.PAGE_SIZE);
                    for (let i = 0; i < pagedCount; i++) {
                        let value = i;
                        let text = ((i * this.CONSTANT.PAGE_SIZE) + 1) + " - " + ((i + 1) * this.CONSTANT.PAGE_SIZE);
                        if (i == defaultValues.page) {
                            pageField.addSelectOption(value, text, true);
                        } else {
                            pageField.addSelectOption(value, text);
                        }
                    }

                    let page = pagedData.fetch({ index: defaultValues.page });
                    let resultJson = {}, partidasInternalIdArray = [];
                    page.data.forEach(result => {
                        let columns = result.columns;
                        let internalid  = result.getValue("internalid");
                        let recordName  = result.getText("custrecord_tk_configuration_import_rec");
                        let recordID    = result.getValue("custrecord_tk_configuration_import_rec");
                        let fileCsv     = result.getValue("custrecord_tk_configuration_import_csv");
                        let nivel       = result.getValue("custrecord_tk_configuration_import_nivel");
                        let importID    = result.getValue("custrecord_tk_configuration_import_cust");
                        resultJson[internalid + "///" + recordID] = {
                            internalid  : internalid,
                            recordName  : recordName,
                            recordID    : recordID,
                            fileCsv     : fileCsv,
                            nivel       : nivel,
                            importID    : importID
                        }
                        partidasInternalIdArray.push(internalid);
                    });

                    
                    let line = 0;
                    for (let partidaId in resultJson) {
                        let result = resultJson[partidaId];
                        log.debug("resultJson",result)
                        resultSubList.setSublistValue("custpage_sublist_objet_name", line, result.recordName);
                        resultSubList.setSublistValue("custpage_sublist_objet_id", line, result.recordID);
                        resultSubList.setSublistValue("custpage_sublist_fielcsv", line, result.fileCsv);
                        resultSubList.setSublistValue("custpage_sublist_nivel", line, result.nivel);
                        resultSubList.setSublistValue("custpage_sublist_importid", line, result.importID);
                        resultSubList.setSublistValue("custpage_sublist_aux", line, result.internalid);
                        line++;
                    }
                }
            }

            setResultSubListScripts = (resultSubList, defaultValues, pageField) => {
                let customSearch = search.load({ id: "customsearch_tk_search_configuration_sc"}); // TK - Search Configuración Scripts	
 
                if (defaultValues.configuration) customSearch.filters.push(this.createFilter("custrecord_tk_configuration_script_paren", search.Operator.ANYOF, defaultValues.configuration));
                if (defaultValues.typeScript) customSearch.filters.push(this.createFilter("scripttype", search.Operator.ANYOF,  defaultValues.typeScript, "custrecord_tk_configuration_script_list"));
                
                let pagedData = customSearch.runPaged({ pageSize: this.CONSTANT.PAGE_SIZE });
                let resultTotalNumber = pagedData.count;
                log.debug("resultTotalNumber",resultTotalNumber)
                if (resultTotalNumber) {
                    //let pageField = this.addField(this.FIELDS_ID.field.page, serverWidget.FieldType.SELECT, this.FIELDS_NAME.field.page, this.FIELDS_ID.fieldgroup.results);
                    let pagedCount = Math.ceil(resultTotalNumber / this.CONSTANT.PAGE_SIZE);
                    for (let i = 0; i < pagedCount; i++) {
                        let value = i;
                        let text = ((i * this.CONSTANT.PAGE_SIZE) + 1) + " - " + ((i + 1) * this.CONSTANT.PAGE_SIZE);
                        if (i == defaultValues.page) {
                            pageField.addSelectOption(value, text, true);
                        } else {
                            pageField.addSelectOption(value, text);
                        }
                    }

                    let page = pagedData.fetch({ index: defaultValues.page });
                    let resultJson = {}, partidasInternalIdArray = [];
                    page.data.forEach(result => {
                        let columns = result.columns;
                        let internalid  = result.getValue("internalid");
                        let scriptName  = result.getText("custrecord_tk_configuration_script_list");
                        let scriptID    = result.getValue("custrecord_tk_configuration_script_list");
                        let scriptType  = result.getValue({join: "custrecord_tk_configuration_script_list", name: "scripttype"});
                        log.debug("alex", scriptType)
                        resultJson[internalid + "///" + scriptID] = {
                            internalid  : internalid,
                            scriptName  : scriptName,
                            scriptID    : scriptID,
                            scriptType  : scriptType
                        }
                        partidasInternalIdArray.push(internalid);
                    });

                    
                    let line = 0;
                    for (let partidaId in resultJson) {
                        let result = resultJson[partidaId];
                        log.debug("resultJson",result)
                        resultSubList.setSublistValue("custpage_sublist_objet_name", line, result.scriptName);
                        resultSubList.setSublistValue("custpage_sublist_objet_id", line, result.scriptID);
                        resultSubList.setSublistValue("custpage_sublist_aux", line, result.internalid);
                        resultSubList.setSublistValue("custpage_sublist_script_type", line, result.scriptType);
                        
                        line++;
                    }
                }
            }

            setResultSubListRecords = (resultSubList, defaultValues, pageField) => {
                let customSearch = search.load({ id: "customsearch_tk_search_configuration_rec"}); // TK - Search Configuración Records
 
                if (defaultValues.configuration) customSearch.filters.push(this.createFilter("custrecord_tk_configuration_rec_parent", search.Operator.IS, defaultValues.configuration));
                
                let pagedData = customSearch.runPaged({ pageSize: this.CONSTANT.PAGE_SIZE });
                let resultTotalNumber = pagedData.count;
                log.debug("resultTotalNumber",resultTotalNumber)
                if (resultTotalNumber) {
                    //let pageField = this.addField(this.FIELDS_ID.field.page, serverWidget.FieldType.SELECT, this.FIELDS_NAME.field.page, this.FIELDS_ID.fieldgroup.results);
                    let pagedCount = Math.ceil(resultTotalNumber / this.CONSTANT.PAGE_SIZE);
                    for (let i = 0; i < pagedCount; i++) {
                        let value = i;
                        let text = ((i * this.CONSTANT.PAGE_SIZE) + 1) + " - " + ((i + 1) * this.CONSTANT.PAGE_SIZE);
                        if (i == defaultValues.page) {
                            pageField.addSelectOption(value, text, true);
                        } else {
                            pageField.addSelectOption(value, text);
                        }
                    }

                    let page = pagedData.fetch({ index: defaultValues.page });
                    let resultJson = {}, partidasInternalIdArray = [];
                    page.data.forEach(result => {
                        let columns = result.columns;
                        let internalid  = result.getValue("internalid");
                        let recordName  = result.getText("custrecord_tk_configuration_rec_records");
                        let recordID    = result.getValue("custrecord_tk_configuration_rec_records");
                        
                        resultJson[internalid + "///" + recordName] = {
                            internalid  : internalid,
                            recordName  : recordName,
                            recordID    : recordID
                        }
                        partidasInternalIdArray.push(internalid);
                    });

                    
                    let line = 0;
                    for (let partidaId in resultJson) {
                        let result = resultJson[partidaId];
                        log.debug("resultJson",result)
                        resultSubList.setSublistValue("custpage_sublist_objet_name", line, result.recordName);
                        resultSubList.setSublistValue("custpage_sublist_objet_id", line, result.recordID);
                        resultSubList.setSublistValue("custpage_sublist_aux", line, result.internalid);
                        
                        line++;
                    }
                }
            }

            setResultSubListSubRecord = (resultSubList, defaultValues, pageField) => {
                let customSearch = search.load({ id: "customsearch_tk_search_configuration_sr" }); // TK - Search Configuración Sub-Rec	
 
                if (defaultValues.configuration) customSearch.filters.push(this.createFilter("custrecord_tk_configuration_sr_parent", search.Operator.ANYOF, defaultValues.configuration));
                
                let pagedData = customSearch.runPaged({ pageSize: this.CONSTANT.PAGE_SIZE });
                let resultTotalNumber = pagedData.count;
                log.debug("resultTotalNumber",resultTotalNumber)
                if (resultTotalNumber) {
                    //let pageField = this.addField(this.FIELDS_ID.field.page, serverWidget.FieldType.SELECT, this.FIELDS_NAME.field.page, this.FIELDS_ID.fieldgroup.results);
                    let pagedCount = Math.ceil(resultTotalNumber / this.CONSTANT.PAGE_SIZE);
                    for (let i = 0; i < pagedCount; i++) {
                        let value = i;
                        let text = ((i * this.CONSTANT.PAGE_SIZE) + 1) + " - " + ((i + 1) * this.CONSTANT.PAGE_SIZE);
                        if (i == defaultValues.page) {
                            pageField.addSelectOption(value, text, true);
                        } else {
                            pageField.addSelectOption(value, text);
                        }
                    }

                    let page = pagedData.fetch({ index: defaultValues.page });
                    let resultJson = {}, partidasInternalIdArray = [];
                    page.data.forEach(result => {
                        let columns = result.columns;
                        let internalid  = result.getValue("internalid");
                        let recordName  = result.getText("custrecord_tk_configuration_sr_record");
                        let recordID    = result.getValue("custrecord_tk_configuration_sr_record");
                        let scriptID    = result.getValue({join:"custrecord_tk_configuration_sr_record", name:"scriptid"});
                        let fieldID     = result.getValue("custrecord_tk_configuration_sr_field");
                        resultJson[internalid + "///" + recordID] = {
                            internalid  : internalid,
                            recordName  : recordName,
                            recordID    : recordID,
                            scriptID    : scriptID,
                            fieldID     : fieldID
                        }
                        partidasInternalIdArray.push(internalid);
                    });

                    
                    let line = 0;
                    for (let partidaId in resultJson) {
                        let result = resultJson[partidaId];
                        log.debug("resultJson",result)
                        resultSubList.setSublistValue("custpage_sublist_objet_name", line, result.recordName);
                        resultSubList.setSublistValue("custpage_sublist_objet_id", line, result.recordID);
                        resultSubList.setSublistValue("custpage_sublist_scriptid", line, result.scriptID);
                        resultSubList.setSublistValue("custpage_sublist_field", line, result.fieldID);
                        resultSubList.setSublistValue("custpage_sublist_aux", line, result.internalid);
                        line++;
                    }
                }
            }

            setAuditoria = (resultSubList, defaultValues, pageField) => {
                let customSearch = search.load({ id: "customsearch_tk_search_auditoria" }); // TK - Search Configuración Sub-Rec	
 
                if (defaultValues.configuration) customSearch.filters.push(this.createFilter("custrecord_tk_auditoria_parent", search.Operator.IS, defaultValues.configuration));
                
                let pagedData = customSearch.runPaged({ pageSize: this.CONSTANT.PAGE_SIZE });
                let resultTotalNumber = pagedData.count;
                log.debug("resultTotalNumber",resultTotalNumber)
                if (resultTotalNumber) {
                    //let pageField = this.addField(this.FIELDS_ID.field.page, serverWidget.FieldType.SELECT, this.FIELDS_NAME.field.page, this.FIELDS_ID.fieldgroup.results);
                    let pagedCount = Math.ceil(resultTotalNumber / this.CONSTANT.PAGE_SIZE);
                    for (let i = 0; i < pagedCount; i++) {
                        let value = i;
                        let text = ((i * this.CONSTANT.PAGE_SIZE) + 1) + " - " + ((i + 1) * this.CONSTANT.PAGE_SIZE);
                        if (i == defaultValues.page) {
                            pageField.addSelectOption(value, text, true);
                        } else {
                            pageField.addSelectOption(value, text);
                        }
                    }

                    let page = pagedData.fetch({ index: defaultValues.page });
                    let resultJson = [], partidasInternalIdArray = [];
                    page.data.forEach(result => {
                        let columns = result.columns;
                        let internalID  = result.getValue("internalid");
                        let date        = result.getValue("custrecord_tk_auditoria_date");
                        let processName = result.getValue("custrecord_tk_auditoria_process");
                        let roles       = result.getText("custrecord_tk_auditoria_roles");
                        let subsidiary  = result.getText("custrecord_tk_auditoria_subsidiary");
                        let detail      = result.getValue("custrecord_tk_auditoria_objects");
                        let status = result.getValue("custrecord_tk_auditoria_status");
                        resultJson.push({
                            internalID  : internalID,
                            date        : date,
                            processName : processName,
                            roles       : roles,
                            subsidiary  : subsidiary,
                            detail      : detail,
                            status      : status
                        })
                    });

                    
                    let line = 0;
                    for (let i = 0; i< resultJson.length; i++) {
                        let result = resultJson[i];
                        log.debug("resultJson",result)
                        resultSubList.setSublistValue("custpage_sublist_objet_name", line, result.processName);
                        resultSubList.setSublistValue("custpage_sublist_date", line, result.date);
                        let obj = result.roles || result.subsidiary;
                        obj= obj.substring(0,299)
                        if (obj != "") resultSubList.setSublistValue("custpage_sublist_roles_subsidiary", line, obj);
                        resultSubList.setSublistValue("custpage_sublist_detail", line, result.detail);
                        resultSubList.setSublistValue("custpage_sublist_status", line, result.status);
                        line++;
                    }
                }
            }

            setSelectedValueFilter = (fieldId, value, targetSearch) => {
                if (!(value != this.CONSTANT.EMPTY_SELECT_VALUE && value)) return;
                let filter = this.createFilter(fieldId, search.Operator.ANYOF, value);
                targetSearch.filters.push(filter);
            }

            createFilter = (name, operator, values, join = null) => {
                let json = { name, operator, values, join };
                log.debug("filters", json);
                return search.createFilter({
                    join,
                    name,
                    operator,
                    values
                });
            }

            addResetButton = () => {
                this.FORM.addResetButton();
            }

            setClientScript = (clientScriptName) => {
                if (!this.FORM) return;
                log.debug("setClientScript", clientScriptName);
                this.FORM.clientScriptModulePath = clientScriptName;
            }
        }

        class Auditoria {
            constructor() {}

            init = () => {
                log.debug("Inicio Auditoria");
            }

            getDate = () => {
                var fechaProceso = new Date();
                var utc1 = fechaProceso.getTime() + (fechaProceso.getTimezoneOffset() * 60000);
                var temp_date = new Date(utc1 + (3600000 * -3));
                var myDate = format.format({ value: temp_date, type: format.Type.DATE });
                var myTime = format.format({ value: temp_date, type: format.Type.TIMEOFDAY});
                var current_date = myDate + " " + myTime;
                var myDate2 = format.parse({ value: current_date, type: format.Type.DATE});

                return myDate2;

            }
 
            setAudit = (date, nameProcess, objects, processStatus, parent, roles = null, subsidiaries = null) => {

                var customRecord = record.create({
                    type: "customrecord_tk_auditoria",
                  });
                  
                    customRecord.setValue({
                      fieldId: "custrecord_tk_auditoria_date",
                      value: date,
                    });
                    customRecord.setValue({
                        fieldId: "custrecord_tk_auditoria_process",
                        value: nameProcess,
                      });
                    customRecord.setValue({
                      fieldId: "custrecord_tk_auditoria_objects",
                      value: objects,
                    });
                    customRecord.setValue({
                      fieldId: "custrecord_tk_auditoria_roles",
                      value: roles,
                    });
                    customRecord.setValue({
                      fieldId: "custrecord_tk_auditoria_subsidiary",
                      value: subsidiaries,
                    });
                    customRecord.setValue({
                        fieldId: "custrecord_tk_auditoria_status",
                        value: processStatus,
                    });
                    customRecord.setValue({
                        fieldId: "custrecord_tk_auditoria_parent",
                        value: parent,
                    });
                    

                    customRecord.save({
                        enablesourcing: true,
                      });

            }
        }

        roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }

        return {
            UserInterface,
            Auditoria
        }
    })