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
        }

        roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }

        return {
            UserInterface,
            Auditoria
        }
    })