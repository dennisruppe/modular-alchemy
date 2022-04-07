# FoundryVTT Module

Implementing parts of the modular crafting system found in 'City and Wild' by Ignacio Portilla, available at https://www.dmsguild.com/product/226033/City-and-Wild.

## How To Use

Click the button on the player list to open the crafting menu.

![Opening the crafting menu.](/docs/startup.jpg)

Drag and drop reagents (included in the Crafting Reagents compendium), preview the possible outcomes, and click a button to craft a new item.

![Drag and drop reagents.](/docs/draganddrop.jpg)

New crafted item is created at the world level, complete with a table in the description summarizing the effects, damage and bomb radius, etc., preconfigured, and active effects attached, ready to be used!

![Sample items.](/docs/sampleitems.jpg)

## Dependencies
-Requires DnD5e system.
-No other modules are required.
-Active effects are configured to use flags from [Active Token Effects](https://github.com/kandashi/Active-Token-Lighting), [DFreds Convenient Effects](https://github.com/DFreds/dfreds-convenient-effects), and [Midi QOL](https://gitlab.com/tposney/midi-qol). Nothing breaks if you don't have these modules installed, but some of the effects won't function.

## Known Issues
-Effects from the source not implemented with active effects:
    -Fog
    -Slipperiness
    -Intensify
    -Water Breathing
-No way to create new reagents and effects as a user.

## Changelog
