/**
 * Custom Kendo ComboBox Component for WCAG 2.0 AA Accessibility
 */
(function ($, kendo) {
	
	var AccessibleComponent = (function (baseInit, baseChange, baseSelect, baseOpen, baseClose) {
		
		// Custom Component that extends component to be accessible
		return kendo.ui.ComboBox.extend({
	
			// Define options to give custom component a unique name
			options: {
				name: "ComboBox",
			},

			/***************************************************************************************************************************
			 * Overrides for existing functions 
			 ***************************************************************************************************************************/
			
			// Override init to initialize custom component
			init: function(element, options) {
				
				var extendedOptions = options ? options: {};
				// extendedOptions.placeholder = "Please select or start typing...";

				// Call Base Component initialization
				baseInit.call(this, element, extendedOptions); 
					
				// Add TITLE attribute to wrapper element to so screen readers will announce default value
				var $wrapper = this._getWrapper();
				$wrapper.attr("aria-selected", "true");
				$wrapper.attr("role", "combobox");
				$wrapper.attr("aria-expanded", false);
				

				// Add unique ID to the associated label if needed so it can be referenced in by ARIA-LABELLEDBY to make component more descriptive
				var elementId = $(element).attr("id");	
				var $label = $wrapper.prev('[for=' + elementId + ']');
				var labelId = $label.attr("id");
				if(!labelId) {
					labelId = elementId + "_label";
					$label.attr("id", labelId);
				}
				$wrapper.attr("aria-labelledby", labelId);

				// Add ARIA-LIVE attribute to k-input element to so screen readers will announce changes in value
				// Generate faux options to handle Voice Over issues
				
				if(this._isMacOs()) {
					this._generateOptionCountWorkaround();
					//this.prevAriaActiveDesc = $wrapper.attr("aria-activedescendant");
					
					$wrapper.attr("aria-live", "polite");
					$wrapper.attr("aria-atomic", "true");
				} else {
					
					this._getGeneratedInput().attr("aria-live", "polite");
					this._getGeneratedInput().attr("aria-atomic", "true");
				}

				var thisComponent = this;
				
				// On press for space if the textbox is empty, open the listbox
				this._getGeneratedInput().on('keypress', function(e) {
					if (e.type == "keypress" || kendo.keys.SPACE == e.keyCode) {
						var value = thisComponent._getGeneratedInput().value;
						 if(!value || (value && value.trim() == "")) {
							thisComponent.open();
						 }
					}
				})
				
				$wrapper.blur(function() {
					$wrapper.attr("title", kendo.format("{0}", thisComponent.text()));
				});
			},
			
			// Override open event to switch off aria-live since navigating opened menu already announced to screen reader
			_change: function(e) {
				if(this._isMacOs()) {
					this._reorderOptions();
				}
				return baseChange.call(this, e);
			},


			// Override open event to switch off aria-live since navigating opened menu already announced to screen reader
			_select: function(e) {
				if(this._isMacOs()) {
					this._overrideAriaActiveDescendant();
				}

				return baseSelect.call(this, e);
			},

			// Override open event to switch off aria-live since navigating opened menu already announced to screen reader
			open: function(e) {
				if(!this._isMacOs()) {
					this._getGeneratedInput().attr("aria-live", "off");				
				}
				this._getWrapper().attr("aria-expanded", true);				
				return baseOpen.call(this, e);
			},

			// Override close event to switch aria-live back to polite so screen readers will annouce changes in value when menu is closed
			close: function(e) {
				if(!this._isMacOs()) {
					this._getGeneratedInput().attr("aria-live", "polite");
				}
				this._getWrapper().attr("aria-expanded", false);				
				return baseClose.call(this, e);
			},

			/***************************************************************************************************************************
			 * Helper Functions used by overridden functions
			 ***************************************************************************************************************************/

			// Helper function to get original input element
			_getElement: function() {
				return $(this.element).first();
			},

			// Helper function to retrieve wrapper element
			_getWrapper: function() {
				return this._getElement().parent();
			},

			// Helper function to retrieve generatedInput
			_getGeneratedInputWrapper: function() {
				return this._getWrapper().find('.k-dropdown-wrap');
			},

			// Helper function to retrieve generatedInput
			_getGeneratedInput: function() {
				return this._getWrapper().find('.k-input');
			},

			// Voice Over workaround for announcing correct number of options
			_generateOptionCountWorkaround: function() {
				// Add ARIA attributes to genrated input
				var kinputId = this._getElement()[0].id + "-kinput";
				var generatedInput = this._getGeneratedInput();
				
				// for setting the aria descendant attribs
				generatedInput.attr("id", kinputId);

				generatedInput.attr("role", "textbox");

				// avoid multiline inputs
				generatedInput.attr("aria-multiline", false);
				// generatedInput.attr("aria-selected", "true");

				// Generate the same number of options as are in the ComboBox
				// var optionOffset = this._isSafariBrowser() ? 2 : 1;
				for(var i = 0; i < (this._getElement().find("option").length - 1); i++) {
					this._getWrapper().append('<span role="option"></span>');
				}
				// Put the original input element at the end of this so "x of y" numbers line up
				this._getElement().insertAfter(this._getWrapper().find("span[role=option]:last"));

				this.prevSelectedIndex = this.selectedIndex;
				this._overrideAriaActiveDescendant();
			},

			// Override the active descendant of the wrapper so that Voice Over announces correct number of options
			_overrideAriaActiveDescendant: function() {
				var kinputId = this._getElement()[0].id + "-kinput";
				var thisComboBox = this;
				setTimeout(function() {
					thisComboBox._getWrapper().attr("aria-activedescendant", kinputId);
				}, 0);
			},

			// Reorder the options so "x of y" numbers line up
			_reorderOptions: function() {
				// If the selected index did not change, don't do anything
				if(this.selectedIndex === this.prevSelectedIndex) {
					console.log('nothing is changed');
					return;

				// If the selected index is 0, place the generated wrapper first on the list
				} else if(this.selectedIndex === 0) {
					console.log('selected one is at first location');
					
					this._getGeneratedInputWrapper().insertBefore(this._getWrapper().children("span[role=option]:first"));

				// Otherwise, place it before/after the selected index depending on where the wrapper currently is
				} else {
					console.log('selected one is somewhere in between');
					
					if(this.prevSelectedIndex < this.selectedIndex) {
						this._getGeneratedInputWrapper().insertAfter(this._getWrapper().children("span[role=option]:nth-child(" + ( this.selectedIndex + 1 ) + ")"));				
					} else {
						this._getGeneratedInputWrapper().insertBefore(this._getWrapper().children("span[role=option]:nth-child(" + ( this.selectedIndex + 1 ) + ")"));									
					}
				}
				this.prevSelectedIndex = this.selectedIndex;
			},

			// Helper function to check if OS is Mac (for Voice Over custom logic)
			_isMacOs: function() {
				return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			},

			// Helper function to check for Safari browser 
			_isSafariBrowser: function() {
				return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
			}
		});

	})(	
		kendo.ui.ComboBox.fn.init, 
		kendo.ui.ComboBox.fn._change,
		kendo.ui.ComboBox.fn._select,
		kendo.ui.ComboBox.fn.open,
		kendo.ui.ComboBox.fn.close
	);
	kendo.ui.plugin(AccessibleComponent);

})(jQuery, kendo);