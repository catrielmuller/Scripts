include(["Functions", "QuickScript", "QuickScript"]);
include(["Functions", "Engines", "Wine"]);
include(["Functions", "Filesystem", "Extract"]);
include(["Functions", "Filesystem", "Files"]);
include(["Functions", "Shortcuts", "Wine"]);
include(["Functions", "Verbs", "luna"]);


function InstallerScript() {
    QuickScript.call(this);
}

InstallerScript.prototype = Object.create(QuickScript.prototype);

InstallerScript.prototype.constructor = InstallerScript;

InstallerScript.prototype.go = function() {
    this._name = this._name || "Custom Installer";
    var setupWizard = SetupWizard(this._name);

    // if no name given, ask user
    if (this._name == "Custom Installer") {
        this._name = setupWizard.textbox("Please enter the name of your application.");
    }

    setupWizard.presentation(this._name, this._editor, this._applicationHomepage, this._author);

    // get installation file from concrete InstallerScript implementation
    var installationCommand = this._installationCommand(setupWizard);

    var wine = new Wine()
        .wizard(setupWizard);

    // let user select wine settings if desired
    if (this._wineUserSettings) {        
        var architectures = ["x86", "amd64"];
        var shownArchitectures = ["x86 (recommended)", "amd64"];
        var selectedArchitecture = setupWizard.menu("Please select the wine architecture.", shownArchitectures, "x86 (recommended)");
        this._wineArchitecture = architectures[selectedArchitecture.index];
        wine.architecture(this._wineArchitecture); // do this here to show correct values for distribution
        
        var distributions = wine.availableDistributions();
        var shownDistributions = [];
        for (var i in distributions) {
            if (distributions[i] == "upstream") {
                shownDistributions.push("upstream (recommended)");
            }
            else {
                shownDistributions.push(distributions[i]);
            }
        }
        var selectedDistribution = setupWizard.menu("Please select the wine distribution.", shownDistributions, "upstream (recommended)");
        this._wineDistribution = distributions[selectedDistribution.index];
        wine.distribution(this._wineDistribution); // do this here to show correct values for version
        
        var versions = wine.availableVersions();
        var shownVersions = [];
        for (var i in versions) {
            if (versions[i] == LATEST_STABLE_VERSION) {
                shownVersions.push(versions[i] + " (recommended)");
            }
            else {
                shownVersions.push(versions[i]);
            }
        }
        var selectedVersion = setupWizard.menu("Please select the wine version.", shownVersions, LATEST_STABLE_VERSION + " (recommended)");
        this._wineVersion = versions[selectedVersion.index];
    }

    // setup the prefix
    wine.architecture(this._wineArchitecture)
        .distribution(this._wineDistribution)
        .version(this._wineVersion)
        .prefix(this._name) // important that architecture, distribution and version are before this!
        .luna()
        .wait();

    this._preInstall(wine, setupWizard);

    // back to generic wait (might have been changed in preInstall)
    setupWizard.wait("Please wait...");

    wine.run(installationCommand.command, installationCommand.args)
        .wait();

    // if no executable given, ask user
    if (!this._executable) {
        this._executable = fileName(setupWizard.browse("Please select the executable.", wine.prefixDirectory, ["exe"]));
    }

    new WineShortcut()
        .name(this._name)
        .prefix(this._name)
        .search(this._executable)
        .arguments(this._executableArgs)
        .miniature([this._category, this._name])
        .create();

    this._postInstall(wine, setupWizard);

    // back to generic wait (might have been changed in postInstall)
    setupWizard.wait("Please wait...");

    setupWizard.close();
};
