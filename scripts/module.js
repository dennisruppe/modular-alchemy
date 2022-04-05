class CraftingConfigData {

    static get allReagentSlots() {
        const allReagentSlots = game.users.reduce((accumulator, user) => {
            const userReagents = this.getReagentSlotsForUser(user.id);
            return {
                ...accumulator,
                ...userReagents
            }
        }, {});

        return allReagentSlots;
    }

    static getReagentSlotsForUser(userId) {
        return game.users.get(userId)?.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS);
    }

    static addReagentSlot(userId, reagentData) {
        const newReagent = {
            ...reagentData,
            id: foundry.utils.randomID(16),
            userId
        }

        const newReagents = {
            [newReagent.id]: newReagent
        }

        return game.users.get(userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, newReagents);
    }

    static updateReagentSlot(reagentId, reagentData) {
        const relevantReagent = this.allReagentSlots[reagentId];

        const update = {
            [reagentId]: reagentData
        }

        return game.users.get(relevantReagent.userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, update);
    }

    static updateReagentSlots(userId, updateData) {
        return game.users.get(userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, updateData);
    }

    static deleteReagentSlot(reagentId) {
        const relevantReagent = this.allReagentSlots[reagentId];
        const keyDeletion = {
            [`-=${reagentId}`]: null
        }

        return game.user.get(relevantReagent.userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, keyDeletion);
    }

    static deleteAllReagentSlotsForUser(userId) {
        const relevantReagents = this.getReagentSlotsForUser(userId);
        const keyDeletions = Object.fromEntries(Object.keys(relevantReagents).map(x => [`-=${x}`,null]));

        return game.users.get(userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, keyDeletions);
    }

    static async getEffectsForReagents(userId) {
        const allReagents = this.getReagentSlotsForUser(userId);
        var effects = {};
        for (const reagentId in allReagents) {
            const reagent = allReagents[reagentId];
            var score = 1;
            switch(reagent.data.rarity) {
                case "common":
                    score = 1;
                    break;
                case "uncommon":
                    score = 2;
                    break;
                case "rare":
                    score = 3;
                    break;
                case "veryRare":
                    score = 4;
                    break;
                default:
                    score = 1;
            }
            ModularAlchemy.log(false, "Checking reagent effects", reagent);
            for (const effectId of reagent.flags[ModularAlchemy.ID][ModularAlchemy.FLAGS.ITEMREAGENTEFFECTS]) {
                const effectJournal = await game.packs.get(ModularAlchemy.SOURCE_EFFECTS).getDocument(effectId);
                const maxlevel = effectJournal.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.EFFECTMAXLEVEL);
                if (effects[effectId]) {
                    effects[effectId]['level'] = Math.min(effects[effectId]['level'] + score, maxlevel);
                } else {
                    effects[effectId] = {
                        level: Math.min(score, maxlevel),
                        name: effectJournal.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.EFFECTNAME),
                        type: effectJournal.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.EFFECTTYPE)
                    }
                }
            }
        }

        // Group effects by type:
        const types = [...new Set(Object.keys(effects).map(effectId => effects[effectId].type))];
        var groupedEffects = {};
        for (const type of types) {
            groupedEffects[type] = Object.keys(effects).filter(effectId => effects[effectId].type === type).map(effectId => effects[effectId]);
        }

        return groupedEffects;
    }
}

class CraftingConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            id: 'crafting-config',
            template: ModularAlchemy.TEMPLATES.CRAFTINGCONFIG,
            title: 'Crafting Config',
            userId: game.userId,
            closeOnSubmit: false,
            submitOnChange: true,
            dragDrop: [{ dragSelector: null, dropSelector: ".crafting-config-reagent-slot" }]
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    async _onDrop(event) {
        ModularAlchemy.log(false, "Drop event", event)
        const data = TextEditor.getDragEventData(event);
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();
        const droppedElement = $(event.target);
        const reagentId = droppedElement.parents('[data-reagent-id]')?.data()?.reagentId;
        if (reagentId === '')
        {
            await CraftingConfigData.addReagentSlot(this.options.userId, itemData);
        } else {
            await CraftingConfigData.updateReagentSlot(reagentId, itemData);
        }
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('click', "[data-action]", this._handleButtonClick.bind(this));        
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const reagentId = clickedElement.parents('[data-reagent-id]')?.data()?.reagentId;

        switch (action) {
            case 'clear': {
                await CraftingConfigData.deleteAllReagentSlotsForUser(this.options.userId);
                this.render();
                break;
            }

            default:
                ModularAlchemy.log(false, 'Invalid action detected', action);
        }
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);

        await CraftingConfigData.updateReagentSlots(this.options.userId, expandedData);
        
        this.render();
    }

    async getData(options) {
        return {
            reagentslots: CraftingConfigData.getReagentSlotsForUser(options.userId),
            notSlotsFull: Object.keys(CraftingConfigData.getReagentSlotsForUser(options.userId)).length < 4,
            effectsPreview: await CraftingConfigData.getEffectsForReagents(options.userId)
        }
    }
}

class ModularAlchemy {
    static ID = 'modular-alchemy';
    static SOURCE_REAGENTS = 'modular-alchemy.crafting-reagents';
    static SOURCE_EFFECTS = 'modular-alchemy.crafting-effects';
    static TEMPLATES = {
        CRAFTINGCONFIG: `modules/${this.ID}/templates/crafting-config.hbs`
    }
    static FLAGS = {
        REAGENTSLOTS: 'reagent-slots',
        ITEMISREAGENT: 'is-reagent',
        ITEMREAGENTEFFECTS: 'reagent-effects',
        EFFECTNAME: 'name',
        EFFECTTYPE: 'effect-type',
        EFFECTMAXLEVEL: 'max-level'
    }

    /**
     * A small helper function which leverages developer mode flags to gate debug logs.
     * 
     * @param {boolean} force - forces the log even if the debug flag is not on
     * @param  {...any} args - what to log
     */
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    } 

    static initialize() {
        this.CraftingConfig = new CraftingConfig();
    }
}

Hooks.once('init', async function() {
    ModularAlchemy.initialize();
});

Hooks.once('ready', async function() {

});


/**
 * Render a button on the Player List
 */
 Hooks.on('renderPlayerList', (playerList, html) => {
    
    // find the element which has our logged in user's id
    const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`)
    
    // create localized tooltip
    const tooltip = game.i18n.localize('MODULAR-ALCHEMY.button-title');

    // insert a button at the end of this element
    loggedInUserListItem.append(
    `<button type='button' class='modular-alchemy-icon-button flex0' title='${tooltip}'><i class='far fa-lightbulb'></i></button>`
    );

    html.on('click', '.modular-alchemy-icon-button', (event) => {
        const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
        ModularAlchemy.CraftingConfig.render(true, {userId});
    });
});



 Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(ModularAlchemy.ID);
});