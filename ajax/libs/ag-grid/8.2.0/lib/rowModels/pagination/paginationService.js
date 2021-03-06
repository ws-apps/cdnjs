/**
 * ag-grid - Advanced Data Grid / Data Table supporting Javascript / React / AngularJS / Web Components
 * @version v8.2.0
 * @link http://www.ag-grid.com/
 * @license MIT
 */
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../../utils");
var gridOptionsWrapper_1 = require("../../gridOptionsWrapper");
var context_1 = require("../../context/context");
var gridPanel_1 = require("../../gridPanel/gridPanel");
var selectionController_1 = require("../../selectionController");
var sortController_1 = require("../../sortController");
var eventService_1 = require("../../eventService");
var events_1 = require("../../events");
var filterManager_1 = require("../../filter/filterManager");
var constants_1 = require("../../constants");
var beanStub_1 = require("../../context/beanStub");
var PaginationService = (function (_super) {
    __extends(PaginationService, _super);
    function PaginationService() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.callVersion = 0;
        return _this;
    }
    PaginationService.prototype.isLastPageFound = function () {
        return this.lastPageFound;
    };
    PaginationService.prototype.getPageSize = function () {
        return this.pageSize;
    };
    PaginationService.prototype.getCurrentPage = function () {
        return this.currentPage;
    };
    PaginationService.prototype.getTotalPages = function () {
        return this.totalPages;
    };
    PaginationService.prototype.getRowCount = function () {
        return this.rowCount;
    };
    PaginationService.prototype.goToNextPage = function () {
        this.goToPage(this.currentPage + 1);
    };
    PaginationService.prototype.goToPreviousPage = function () {
        this.goToPage(this.currentPage - 1);
    };
    PaginationService.prototype.goToFirstPage = function () {
        this.goToPage(0);
    };
    PaginationService.prototype.goToLastPage = function () {
        if (this.lastPageFound) {
            this.goToPage(this.totalPages - 1);
        }
    };
    PaginationService.prototype.goToPage = function (page) {
        if (page < 0) {
            // min page is zero
            this.currentPage = 0;
        }
        else if (this.lastPageFound && page > this.totalPages) {
            // max page is totalPages-1 IF we konw the last page
            this.currentPage = this.totalPages - 1;
        }
        else {
            // otherwise take page as is
            this.currentPage = page;
        }
        this.loadPage();
    };
    PaginationService.prototype.init = function () {
        // if we are doing pagination, we are guaranteed that the model type
        // is normal. if it is not, then this paginationController service
        // will never be called.
        if (this.rowModel.getType() === constants_1.Constants.ROW_MODEL_TYPE_NORMAL) {
            this.inMemoryRowModel = this.rowModel;
        }
        var paginationEnabled = this.gridOptionsWrapper.isRowModelPagination();
        // if not doing pagination, then quite the setup
        if (!paginationEnabled) {
            return;
        }
        if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
            this.addDestroyableEventListener(this.eventService, events_1.Events.EVENT_FILTER_CHANGED, this.reset.bind(this, false));
        }
        if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
            this.addDestroyableEventListener(this.eventService, events_1.Events.EVENT_SORT_CHANGED, this.reset.bind(this, false));
        }
        this.setDatasource(this.gridOptionsWrapper.getDatasource());
    };
    PaginationService.prototype.setDatasource = function (datasource) {
        this.datasource = datasource;
        if (datasource) {
            this.checkForDeprecated();
            this.reset(true);
        }
    };
    PaginationService.prototype.checkForDeprecated = function () {
        var ds = this.datasource;
        if (utils_1.Utils.exists(ds.pageSize)) {
            console.error('ag-Grid: since version 5.1.x, pageSize is replaced with grid property paginationPageSize');
        }
    };
    PaginationService.prototype.reset = function (freshDatasource) {
        // important to return here, as the user could be setting filter or sort before
        // data-source is set
        if (utils_1.Utils.missing(this.datasource)) {
            return;
        }
        // if user is providing id's, then this means we can keep the selection between datsource hits,
        // as the rows will keep their unique id's even if, for example, server side sorting or filtering
        // is done. if it's a new datasource, then always clear the selection.
        var userGeneratingRows = utils_1.Utils.exists(this.gridOptionsWrapper.getRowNodeIdFunc());
        var resetSelectionController = freshDatasource || !userGeneratingRows;
        if (resetSelectionController) {
            this.selectionController.reset();
        }
        // copy pageSize, to guard against it changing the the datasource between calls
        this.pageSize = this.gridOptionsWrapper.getPaginationPageSize();
        if (!(this.pageSize >= 1)) {
            this.pageSize = 100;
        }
        // see if we know the total number of pages, or if it's 'to be decided'
        if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
            this.rowCount = this.datasource.rowCount;
            this.lastPageFound = true;
            this.calculateTotalPages();
        }
        else {
            this.rowCount = 0;
            this.lastPageFound = false;
            this.totalPages = null;
        }
        this.resetCurrentPage();
        this.eventService.dispatchEvent(events_1.Events.EVENT_PAGINATION_RESET);
        this.loadPage();
    };
    PaginationService.prototype.resetCurrentPage = function () {
        var userFirstPage = this.gridOptionsWrapper.getPaginationStartPage();
        if (userFirstPage > 0) {
            this.currentPage = userFirstPage;
        }
        else {
            this.currentPage = 0;
        }
    };
    PaginationService.prototype.calculateTotalPages = function () {
        this.totalPages = Math.floor((this.rowCount - 1) / this.pageSize) + 1;
    };
    PaginationService.prototype.pageLoaded = function (rows, lastRowIndex) {
        lastRowIndex = utils_1.Utils.cleanNumber(lastRowIndex);
        var firstId = this.currentPage * this.pageSize;
        this.inMemoryRowModel.setRowData(rows, true, firstId);
        // see if we hit the last row
        if (!this.lastPageFound && lastRowIndex >= 0) {
            this.lastPageFound = true;
            this.rowCount = lastRowIndex;
            this.calculateTotalPages();
            // if overshot pages, go back
            if (this.currentPage > this.totalPages) {
                this.currentPage = this.totalPages - 1;
                this.loadPage();
            }
        }
        this.eventService.dispatchEvent(events_1.Events.EVENT_PAGINATION_PAGE_LOADED);
    };
    PaginationService.prototype.loadPage = function () {
        var _this = this;
        var startRow = this.currentPage * this.pageSize;
        var endRow = (this.currentPage + 1) * this.pageSize;
        this.callVersion++;
        var callVersionCopy = this.callVersion;
        var that = this;
        this.gridPanel.showLoadingOverlay();
        var sortModel;
        if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
            sortModel = this.sortController.getSortModel();
        }
        var filterModel;
        if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
            filterModel = this.filterManager.getFilterModel();
        }
        var params = {
            startRow: startRow,
            endRow: endRow,
            successCallback: successCallback,
            failCallback: failCallback,
            sortModel: sortModel,
            filterModel: filterModel,
            context: this.gridOptionsWrapper.getContext()
        };
        // check if old version of datasource used
        var getRowsParams = utils_1.Utils.getFunctionParameters(this.datasource.getRows);
        if (getRowsParams.length > 1) {
            console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
            console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
        }
        // put in timeout, to force result to be async
        setTimeout(function () {
            _this.datasource.getRows(params);
        }, 0);
        this.eventService.dispatchEvent(events_1.Events.EVENT_PAGINATION_PAGE_REQUESTED);
        function successCallback(rows, lastRowIndex) {
            if (that.isCallDaemon(callVersionCopy)) {
                return;
            }
            that.pageLoaded(rows, lastRowIndex);
        }
        function failCallback() {
            if (that.isCallDaemon(callVersionCopy)) {
                return;
            }
            // set in an empty set of rows, this will at
            // least get rid of the loading panel, and
            // stop blocking things
            that.inMemoryRowModel.setRowData([], true);
        }
    };
    PaginationService.prototype.isCallDaemon = function (versionCopy) {
        return versionCopy !== this.callVersion;
    };
    return PaginationService;
}(beanStub_1.BeanStub));
__decorate([
    context_1.Autowired('filterManager'),
    __metadata("design:type", filterManager_1.FilterManager)
], PaginationService.prototype, "filterManager", void 0);
__decorate([
    context_1.Autowired('gridPanel'),
    __metadata("design:type", gridPanel_1.GridPanel)
], PaginationService.prototype, "gridPanel", void 0);
__decorate([
    context_1.Autowired('gridOptionsWrapper'),
    __metadata("design:type", gridOptionsWrapper_1.GridOptionsWrapper)
], PaginationService.prototype, "gridOptionsWrapper", void 0);
__decorate([
    context_1.Autowired('selectionController'),
    __metadata("design:type", selectionController_1.SelectionController)
], PaginationService.prototype, "selectionController", void 0);
__decorate([
    context_1.Autowired('sortController'),
    __metadata("design:type", sortController_1.SortController)
], PaginationService.prototype, "sortController", void 0);
__decorate([
    context_1.Autowired('eventService'),
    __metadata("design:type", eventService_1.EventService)
], PaginationService.prototype, "eventService", void 0);
__decorate([
    context_1.Autowired('rowModel'),
    __metadata("design:type", Object)
], PaginationService.prototype, "rowModel", void 0);
__decorate([
    context_1.PostConstruct,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaginationService.prototype, "init", null);
PaginationService = __decorate([
    context_1.Bean('paginationService')
], PaginationService);
exports.PaginationService = PaginationService;
