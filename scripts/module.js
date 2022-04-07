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
        return game.users.get(userId)?.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS) ?? {};
    }

    static getReagentSlot(reagentId) {
        return this.allReagentSlots[reagentId];
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
        const relevantReagent = this.getReagentSlot(reagentId);
        const keyDeletion = {
            [`-=${reagentId}`]: null
        }

        return game.users.get(relevantReagent.userId)?.setFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.REAGENTSLOTS, keyDeletion);
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
            
            for (const effectId of reagent.flags[ModularAlchemy.ID][ModularAlchemy.FLAGS.ITEMREAGENTEFFECTS]) {
                const effectJournal = await game.packs.get(ModularAlchemy.SOURCE_EFFECTS).getDocument(effectId);
                const maxlevel = effectJournal.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.EFFECTMAXLEVEL);
                if (effects[effectId]) {
                    effects[effectId]['level'] = Math.min(effects[effectId]['level'] + score, maxlevel);
                } else {
                    effects[effectId] = {
                        id: effectId,
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

    static romanNumeral(num) {
        return ['I', 'II', 'III', 'IV', 'V'][num-1];
    }

    static consumableTypeMapping(type) {
        const map = {
            'Bomb': 'trinket',
            'Poison': 'poison',
            'Potion': 'potion'
        }
        return map[type];
    }

    static getDCForEffectLevel(level) {
        const map = {
            1: 10,
            2: 13,
            3: 15,
            4: 17
        }
        return map[level];
    }

    static getAreaForEffectLevel(level) {
        const map = {
            1: 5,
            2: 10,
            3: 15,
            4: 20
        }
        return map[level];
    }

    static getDurationForEffectLevel(level) {
        const map = {
            1: {value: 1, units: 'minute'},
            2: {value: 10, units: 'minute'},
            3: {value: 1, units: 'hour'},
            4: {value: 5, units: 'hour'}
        }
        return map[level];
    }

    static getBombDamageForEffectLevel(level) {
        const map = {
            1: "1d6",
            2: "3d6",
            3: "5d6",
            4: "7d6"
        }
        return map[level];
    }

    static getPoisonDamageForEffectLevel(level) {
        const map = {
            1: "1d6",
            2: "3d6",
            3: "5d6",
            4: "6d6"
        }
        return map[level];
    }

    static getPotionHealingForEffectLevel(level) {
        const map = {
            1: "2d4+2",
            2: "4d4+4",
            3: "8d4+8",
            4: "10d4+20"
        }
        return map[level];
    }

    static tableToJson(table) { 
        var parser = new DOMParser();
        var doc    = parser.parseFromString(table, "text/html");
        var obj    = [].map.call(doc.querySelectorAll('tr'), tr => {
            return [].slice.call(tr.querySelectorAll('td')).reduce( (a,b,i) => {
                return a['col' + (i+1)] = b.textContent, a;
            }, {});
        });

        return obj
    }

    static async createNewItem(type, effects) {

        const highestLevel = Math.max(...effects.map(x => x.level));

        const typeSpecificData = {data: {}};

        switch (type) {
            case 'Bomb':
                typeSpecificData['img'] = 'icons/weapons/thrown/bomb-fuse-black-grey.webp';
                typeSpecificData['data']['ability'] = 'dex';
                typeSpecificData['data']['actionType'] = 'save';
                typeSpecificData['data']['range'] = {value: 30, units: 'ft'};
                typeSpecificData['data']['save'] = {ability: 'dex', dc: this.getDCForEffectLevel(highestLevel), scaling: 'flat'};
                typeSpecificData['data']['target'] = {value: this.getAreaForEffectLevel(highestLevel), units: 'ft', type: 'radius'};
                const bombDamages = effects.filter(x => x.name.startsWith('Bomb')).map(x => [this.getBombDamageForEffectLevel(x.level), /Bomb \((.*)\)/.exec(x.name)?.[1]?.toLowerCase()]);
                typeSpecificData['data']['damage'] = {parts: bombDamages};
                break;
            case 'Poison':
                typeSpecificData['img'] = 'icons/consumables/potions/potion-bottle-skull-label-poison-teal.webp';
                typeSpecificData['data']['ability'] = 'con';
                typeSpecificData['data']['actionType'] = 'save';
                typeSpecificData['data']['save'] = {ability: 'con', dc: this.getDCForEffectLevel(highestLevel), scaling: 'flat'};
                typeSpecificData['data']['duration'] = this.getDurationForEffectLevel(highestLevel);
                const poisonDamages = effects.filter(x => x.name.startsWith('Harm')).map(x => [this.getPoisonDamageForEffectLevel(x.level), 'poison']);
                typeSpecificData['data']['damage'] = {parts: poisonDamages};
                break;
            case 'Potion':
                typeSpecificData['img'] = 'icons/consumables/potions/potion-bottle-corked-fancy-blue.webp';
                typeSpecificData['data']['actionType'] = 'heal';
                typeSpecificData['data']['duration'] = this.getDurationForEffectLevel(highestLevel);
                const potionHealing = effects.filter(x => x.name.startsWith('Healing')).map(x => [this.getPotionHealingForEffectLevel(x.level), 'healing']);
                typeSpecificData['data']['damage'] = {parts: potionHealing};
                break;    
            default:
                break;
        }

        // Adding description, cut and paste from tables in journals
        const effectsPreview = []; // [{Name: "test", Level: 1, Type: type, Effect: "test"}]
        effects.forEach(async (effect) => {
            const effectJournal = await game.packs.get(ModularAlchemy.SOURCE_EFFECTS).getDocument(effect.id);
            const content = this.tableToJson(effectJournal.data.content);
            content.slice(1)
            .filter( row => row.col2 == effect.level.toString())
            .map(row => ({
                Name: row.col1,
                Effect: row.col4
            }))
            .forEach( row => {
                effectsPreview.push(row);
            })
        })

        // Set up data for template
        const descriptionData = {
            level: highestLevel, 
            isBomb: type==='Bomb', 
            isPoison: type==='Poison', 
            isPotion: type==='Potion', 
            type: type, 
            dc: typeSpecificData['data']['save']?.['dc'], 
            radius: typeSpecificData['data']['target']?.['value'],
            duration: typeSpecificData['data']['duration'],
            effectsPreview: effectsPreview
        };
        if (descriptionData.duration?.value > 1) {
            descriptionData.duration.units += 's'
        }
        const htmlDescription = await renderTemplate(ModularAlchemy.TEMPLATES.CRAFTEDITEMDESCRIPTION, descriptionData);

        const data = {
            name: `Modular ${type}: [${effects.map(x=>x.name+' '+this.romanNumeral(x.level)).join(', ')}]`,
            type: 'consumable',
            data: {
                description: {value: htmlDescription},
                consumableType: this.consumableTypeMapping(type),
                activation: {cost: 1, type: 'action'},
                uses: {value: 1, max: 1, per: 'charges', autodestroy: false}
            }
        };

        const mergedData = foundry.utils.mergeObject(data, typeSpecificData);
        const craftedItem = await Item.create(mergedData);

        // update with active effects: 
        const allEffectData = [];
        const effectsPack = await game.packs.get(ModularAlchemy.SOURCE_ACTIVE_EFFECTS);
        await effectsPack.getIndex();
        for (const effect of effects) {
            const effectNames = effect.name.split(/[()]/);
            const effectGroup = effectNames[0]?.trim();
            const effectSubtype = effectNames[1]?.trim();
            const effectIndex = effectsPack.index.find(item => item.name.includes(effectGroup));
            if (effectIndex) {
                const effectItem = await effectsPack.getDocument(effectIndex._id);
                const foundActiveEffect = effectItem.data.effects.find(ae => (ae.data.label.endsWith(this.romanNumeral(effect.level))));
                if (foundActiveEffect) {
                    let effectData = foundActiveEffect.toObject();
                    effectData.origin = `Item.${craftedItem.data._id}`
                    // Got the right level, modify with subtype if necessary
                    // Update duration based on overall level
                    effectData.duration.seconds = typeSpecificData['data']['duration']?.value * (typeSpecificData['data']['duration']?.units === 'minute' ? 60 : 3600);
                    effectData.duration.rounds = effectData.duration.seconds / 6;

                    // Includes Condition, Fortify, Resistance, Vulnerability, and Weakness
                    if (effectSubtype) {
                        effectData.label = effect.name + ' ' + this.romanNumeral(effect.level);
                        
                        if (effectGroup === 'Condition') {
                            effectData.changes.forEach(change => {
                                change.value = `Convenient Effect: ${effectSubtype}`;
                            })
                        } else if (effectGroup === 'Vulnerability' || effectGroup === 'Resistance') {
                            effectData.changes.forEach(change => {
                                change.key = change.key.replaceAll('acid', effectSubtype.toLowerCase());
                                change.value = change.value.replaceAll('acid', effectSubtype.toLowerCase());
                            })
                        } else if (effectGroup === 'Fortify' || effectGroup === 'Weakness') {
                            effectData.changes.forEach(change => {
                                change.key = change.key.replaceAll(/\.cha(\.|$)/g, `.${effectSubtype.toLowerCase().slice(0, 3)}$1`);
                            })
                        }
                    }
                    
                    allEffectData.push(effectData);
                }
            }            
        }

        await craftedItem.createEmbeddedDocuments('ActiveEffect', allEffectData);

        return craftedItem;
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
        const data = TextEditor.getDragEventData(event);
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();
        const droppedElement = $(event.target);
        const reagentId = droppedElement.parents('[data-reagent-id]')?.data()?.reagentId;
        if (item.getFlag(ModularAlchemy.ID, ModularAlchemy.FLAGS.ITEMISREAGENT)) {
            if (reagentId === '')
            {
                await CraftingConfigData.addReagentSlot(this.options.userId, itemData);
            } else {
                await CraftingConfigData.updateReagentSlot(reagentId, itemData);
            }
        } else {
            ui.notifications.warn(`${item.name} is not a valid reagent.`);
        }
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('click', "[data-action]", this._handleButtonClick.bind(this));        
        html.on('mousedown', ".crafting-config-reagent-slot", this._handleReagentSlotClick.bind(this));
        html.on('click', ".table-row-effect", this._handleEffectRowClick.bind(this));
    }

    async _handleReagentSlotClick(event) {
        const clickedElement = $(event.currentTarget);
        const reagentId = clickedElement.data().reagentId;
        switch (event.which) {
            case 1:
                // left-click: view item details
                const tempItem = await Item.create(CraftingConfigData.getReagentSlot(reagentId), {temporary: true});
                tempItem.sheet?.render(true);
                break;
            case 3:
                // right-click: delete
                await CraftingConfigData.deleteReagentSlot(reagentId);
                this.render();
                break;
            default:
                break;
        }
        
    }

    async _handleEffectRowClick(event) {
        const clickedElement = $(event.currentTarget);
        const effectId = clickedElement.data()?.effectId;
        const effectJournal = await game.packs.get(ModularAlchemy.SOURCE_EFFECTS).getDocument(effectId);
        effectJournal.sheet.render(true);
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const actions = action.split(" ");
        switch (actions[0]) {
            case 'clear': {
                await CraftingConfigData.deleteAllReagentSlotsForUser(this.options.userId);
                this.render();
                break;
            }
            case 'craft': {
                const effects = await CraftingConfigData.getEffectsForReagents(this.options.userId);
                const relEffects = effects[actions[1]];
                const newItem = await CraftingConfigData.createNewItem(actions[1], relEffects);
                this.render();
                ui.notifications.info(`${ModularAlchemy.ID}: New ${actions[1]} crafted: ${newItem.name}!`);
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
    static SOURCE_ACTIVE_EFFECTS = 'modular-alchemy.crafting-active-effects';
    static TEMPLATES = {
        CRAFTINGCONFIG: `modules/${this.ID}/templates/crafting-config.hbs`,
        CRAFTEDITEMDESCRIPTION: `modules/${this.ID}/templates/crafted-item-description.hbs`
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