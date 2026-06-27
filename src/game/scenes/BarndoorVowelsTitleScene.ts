import Phaser from "phaser";

import {
    getConfiguredBgmVolume,
    loadParentalSettings,
    saveParentalSettings
} from "../settings/parentalSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

interface FossilTitleButton {
    button: Phaser.GameObjects.Image;
    hitZone: Phaser.GameObjects.Zone;
    activeTextureKey: string;
    inactiveTextureKey: string;
    onClick: () => void;
}

const TITLE_BUTTON_HEIGHT = 64;
const TITLE_BUTTON_SELECTED_SCALE = 1.04;

export class FossilDigTitleScene extends Phaser.Scene {
    private selectedIndex = 0;
    private buttons: FossilTitleButton[] = [];
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private enterKey?: Phaser.Input.Keyboard.Key;
    private escapeKey?: Phaser.Input.Keyboard.Key;
    private overlayVisible = false;
    private overlay?: Phaser.GameObjects.Container;
    private bgm?: Phaser.Sound.BaseSound;

    constructor() {
        super(SCENE_KEYS.FOSSIL_DIG_TITLE);
    }

    create(): void {
        this.resetTitleCamera();
        this.startBackgroundMusic();

        this.add
            .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.TITLE_SCREEN)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(0);

        this.add
            .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x08111a, 0.15)
            .setDepth(1);

        this.createButton(
            0,
            540,
            ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
            ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
            () => this.startGame()
        );
        this.createButton(
            1,
            615,
            ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
            ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
            () => this.showSettingsOverlay()
        );
        this.createButton(
            2,
            690,
            ASSET_KEYS.TITLE_BUTTON_EXIT_ACTIVE,
            ASSET_KEYS.TITLE_BUTTON_EXIT_INACTIVE,
            () => this.returnToGameSelect()
        );

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.refreshSelection();
    }

    update(): void {
        if (!this.cursors || !this.enterKey || !this.escapeKey) {
            return;
        }

        if (this.overlayVisible) {
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
                this.hideOverlay();
            }

            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            playButtonClick(this);
            this.returnToGameSelect();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
            playButtonHover(this);
            this.refreshSelection();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.selectedIndex =
                (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
            playButtonHover(this);
            this.refreshSelection();
        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.activateSelection();
        }
    }
}