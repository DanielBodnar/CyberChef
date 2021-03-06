/* globals Sortable */

/**
 * Waiter to handle events related to the recipe.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 *
 * @constructor
 * @param {HTMLApp} app - The main view object for CyberChef.
 * @param {Manager} manager - The CyberChef event manager.
 */
var RecipeWaiter = function(app, manager) {
    this.app = app;
    this.manager = manager;
    this.removeIntent = false;
};


/**
 * Sets up the drag and drop capability for operations in the operations and recipe areas.
 */
RecipeWaiter.prototype.initialiseOperationDragNDrop = function() {
    var recList = document.getElementById("rec-list");


    // Recipe list
    Sortable.create(recList, {
        group: "recipe",
        sort: true,
        animation: 0,
        delay: 0,
        filter: ".arg-input,.arg", // Relies on commenting out a line in Sortable.js which calls evt.preventDefault()
        setData: function(dataTransfer, dragEl) {
            dataTransfer.setData("Text", dragEl.querySelector(".arg-title").textContent);
        },
        onEnd: function(evt) {
            if (this.removeIntent) {
                evt.item.remove();
                evt.target.dispatchEvent(this.manager.operationremove);
            }
        }.bind(this)
    });

    Sortable.utils.on(recList, "dragover", function() {
        this.removeIntent = false;
    }.bind(this));

    Sortable.utils.on(recList, "dragleave", function() {
        this.removeIntent = true;
        this.app.progress = 0;
    }.bind(this));

    Sortable.utils.on(recList, "touchend", function(e) {
        var loc = e.changedTouches[0],
            target = document.elementFromPoint(loc.clientX, loc.clientY);

        this.removeIntent = !recList.contains(target);
    }.bind(this));

    // Favourites category
    document.querySelector("#categories a").addEventListener("dragover", this.favDragover.bind(this));
    document.querySelector("#categories a").addEventListener("dragleave", this.favDragleave.bind(this));
    document.querySelector("#categories a").addEventListener("drop", this.favDrop.bind(this));
};


/**
 * Creates a drag-n-droppable seed list of operations.
 *
 * @param {element} listEl - The list the initialise
 */
RecipeWaiter.prototype.createSortableSeedList = function(listEl) {
    Sortable.create(listEl, {
        group: {
            name: "recipe",
            pull: "clone",
            put: false
        },
        sort: false,
        setData: function(dataTransfer, dragEl) {
            dataTransfer.setData("Text", dragEl.textContent);
        },
        onStart: function(evt) {
            $(evt.item).popover("destroy");
            evt.item.setAttribute("data-toggle", "popover-disabled");
        },
        onEnd: this.opSortEnd.bind(this)
    });
};


/**
 * Handler for operation sort end events.
 * Removes the operation from the list if it has been dropped outside. If not, adds it to the list
 * at the appropriate place and initialises it.
 *
 * @fires Manager#operationadd
 * @param {event} evt
 */
RecipeWaiter.prototype.opSortEnd = function(evt) {
    if (this.removeIntent) {
        if (evt.item.parentNode.id === "rec-list") {
            evt.item.remove();
        }
        return;
    }

    // Reinitialise the popover on the original element in the ops list because for some reason it
    // gets destroyed and recreated.
    $(evt.clone).popover();
    $(evt.clone).children("[data-toggle=popover]").popover();

    if (evt.item.parentNode.id !== "rec-list") {
        return;
    }

    this.buildRecipeOperation(evt.item);
    evt.item.dispatchEvent(this.manager.operationadd);
};


/**
 * Handler for favourite dragover events.
 * If the element being dragged is an operation, displays a visual cue so that the user knows it can
 * be dropped here.
 *
 * @param {event} e
 */
RecipeWaiter.prototype.favDragover = function(e) {
    if (e.dataTransfer.effectAllowed !== "move")
        return false;

    e.stopPropagation();
    e.preventDefault();
    if (e.target.className && e.target.className.indexOf("category-title") > -1) {
        // Hovering over the a
        e.target.classList.add("favourites-hover");
    } else if (e.target.parentNode.className && e.target.parentNode.className.indexOf("category-title") > -1) {
        // Hovering over the Edit button
        e.target.parentNode.classList.add("favourites-hover");
    } else if (e.target.parentNode.parentNode.className && e.target.parentNode.parentNode.className.indexOf("category-title") > -1) {
        // Hovering over the image on the Edit button
        e.target.parentNode.parentNode.classList.add("favourites-hover");
    }
};


/**
 * Handler for favourite dragleave events.
 * Removes the visual cue.
 *
 * @param {event} e
 */
RecipeWaiter.prototype.favDragleave = function(e) {
    e.stopPropagation();
    e.preventDefault();
    document.querySelector("#categories a").classList.remove("favourites-hover");
};


/**
 * Handler for favourite drop events.
 * Adds the dragged operation to the favourites list.
 *
 * @param {event} e
 */
RecipeWaiter.prototype.favDrop = function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.classList.remove("favourites-hover");

    var opName = e.dataTransfer.getData("Text");
    this.app.addFavourite(opName);
};


/**
 * Handler for ingredient change events.
 *
 * @fires Manager#statechange
 */
RecipeWaiter.prototype.ingChange = function() {
    window.dispatchEvent(this.manager.statechange);
};


/**
 * Handler for disable click events.
 * Updates the icon status.
 *
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.disableClick = function(e) {
    var icon = e.target;

    if (icon.getAttribute("disabled") === "false") {
        icon.setAttribute("disabled", "true");
        icon.classList.add("disable-icon-selected");
        icon.parentNode.parentNode.classList.add("disabled");
    } else {
        icon.setAttribute("disabled", "false");
        icon.classList.remove("disable-icon-selected");
        icon.parentNode.parentNode.classList.remove("disabled");
    }

    this.app.progress = 0;
    window.dispatchEvent(this.manager.statechange);
};


/**
 * Handler for breakpoint click events.
 * Updates the icon status.
 *
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.breakpointClick = function(e) {
    var bp = e.target;

    if (bp.getAttribute("break") === "false") {
        bp.setAttribute("break", "true");
        bp.classList.add("breakpoint-selected");
    } else {
        bp.setAttribute("break", "false");
        bp.classList.remove("breakpoint-selected");
    }

    window.dispatchEvent(this.manager.statechange);
};


/**
 * Handler for operation doubleclick events.
 * Removes the operation from the recipe and auto bakes.
 *
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.operationDblclick = function(e) {
    e.target.remove();
    window.dispatchEvent(this.manager.statechange);
};


/**
 * Handler for operation child doubleclick events.
 * Removes the operation from the recipe.
 *
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.operationChildDblclick = function(e) {
    e.target.parentNode.remove();
    window.dispatchEvent(this.manager.statechange);
};


/**
 * Generates a configuration object to represent the current recipe.
 *
 * @returns {recipeConfig}
 */
RecipeWaiter.prototype.getConfig = function() {
    var config = [], ingredients, ingList, disabled, bp, item,
        operations = document.querySelectorAll("#rec-list li.operation");

    for (var i = 0; i < operations.length; i++) {
        ingredients = [];
        disabled = operations[i].querySelector(".disable-icon");
        bp = operations[i].querySelector(".breakpoint");
        ingList = operations[i].querySelectorAll(".arg");

        for (var j = 0; j < ingList.length; j++) {
            if (ingList[j].getAttribute("type") === "checkbox") {
                // checkbox
                ingredients[j] = ingList[j].checked;
            } else if (ingList[j].classList.contains("toggle-string")) {
                // toggleString
                ingredients[j] = {
                    option: ingList[j].previousSibling.children[0].textContent.slice(0, -1),
                    string: ingList[j].value
                };
            } else {
                // all others
                ingredients[j] = ingList[j].value;
            }
        }

        item = {
            op: operations[i].querySelector(".arg-title").textContent,
            args: ingredients
        };

        if (disabled && disabled.getAttribute("disabled") === "true") {
            item.disabled = true;
        }

        if (bp && bp.getAttribute("break") === "true") {
            item.breakpoint = true;
        }

        config.push(item);
    }

    return config;
};


/**
 * Moves or removes the breakpoint indicator in the recipe based on the position.
 *
 * @param {number} position
 */
RecipeWaiter.prototype.updateBreakpointIndicator = function(position) {
    var operations = document.querySelectorAll("#rec-list li.operation");
    for (var i = 0; i < operations.length; i++) {
        if (i === position) {
            operations[i].classList.add("break");
        } else {
            operations[i].classList.remove("break");
        }
    }
};


/**
 * Given an operation stub element, this function converts it into a full recipe element with
 * arguments.
 *
 * @param {element} el - The operation stub element from the operations pane
 */
RecipeWaiter.prototype.buildRecipeOperation = function(el) {
    var opName = el.textContent;
    var op = new HTMLOperation(opName, this.app.operations[opName], this.app, this.manager);
    el.innerHTML = op.toFullHtml();

    if (this.app.operations[opName].flowControl) {
        el.classList.add("flow-control-op");
    }

    // Disable auto-bake if this is a manual op - this should be moved to the 'operationadd'
    // handler after event restructuring
    if (op.manualBake && this.app.autoBake_) {
        this.manager.controls.setAutoBake(false);
        this.app.alert("Auto-Bake is disabled by default when using this operation.", "info", 5000);
    }
};

/**
 * Adds the specified operation to the recipe.
 *
 * @fires Manager#operationadd
 * @param {string} name - The name of the operation to add
 * @returns {element}
 */
RecipeWaiter.prototype.addOperation = function(name) {
    var item = document.createElement("li");

    item.classList.add("operation");
    item.innerHTML = name;
    this.buildRecipeOperation(item);
    document.getElementById("rec-list").appendChild(item);

    item.dispatchEvent(this.manager.operationadd);
    return item;
};


/**
 * Removes all operations from the recipe.
 *
 * @fires Manager#operationremove
 */
RecipeWaiter.prototype.clearRecipe = function() {
    var recList = document.getElementById("rec-list");
    while (recList.firstChild) {
        recList.removeChild(recList.firstChild);
    }
    recList.dispatchEvent(this.manager.operationremove);
};


/**
 * Handler for operation dropdown events from toggleString arguments.
 * Sets the selected option as the name of the button.
 *
 * @param {event} e
 */
RecipeWaiter.prototype.dropdownToggleClick = function(e) {
    var el = e.target,
        button = el.parentNode.parentNode.previousSibling;

    button.innerHTML = el.textContent + " <span class='caret'></span>";
    this.ingChange();
};


/**
 * Handler for operationadd events.
 *
 * @listens Manager#operationadd
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.opAdd = function(e) {
    window.dispatchEvent(this.manager.statechange);
};


/**
 * Handler for operationremove events.
 *
 * @listens Manager#operationremove
 * @fires Manager#statechange
 * @param {event} e
 */
RecipeWaiter.prototype.opRemove = function(e) {
    window.dispatchEvent(this.manager.statechange);
};
