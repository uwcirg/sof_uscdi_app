const defaultSectionDisplayFn = listSection;
const defaultItemDisplayFn = simpleItem;

const patientResourceConfig = {
    'Patient': {
        sectionDisplayFn: patientSection,
    },
    'AllergyIntolerance': {
        title: 'Allergies and Intolerances',
    },
    // 'MedicationStatement': {}, // Not in EPIC USCDI R4
    'MedicationRequest': {},
    'Medication': {}, // can't search by patient; "Only an _ID search is allowed."
    'Condition': {},
    'Observation': {}, // "Must have either code or category."
    'Organization': {}, // can't search by patient; "Only an _ID search is allowed."
    'Immunization': {
        title: 'Immunization History',
        itemDisplayFn: immunizationItem,
    },
    'Device': {},
    // 'DeviceUseStatement': {}, // Not in EPIC USCDI R4
    'DiagnosticReport': {},
    // 'ImagingStudy': {}, // Not in EPIC USCDI R4
    // 'Media': {}, // Not in EPIC USCDI R4
    'Practitioner': {}, // can't search by patient; "Either name, family, or identifier is a required parameter."
    'PractitionerRole': {},  // can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
    'Procedure': {},
    // 'Specimen': {}, // Not in EPIC USCDI R4
}

const patientResourceScope = Object.keys(patientResourceConfig).map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: 'c916889f-4e33-4dfa-980d-966ba49315f3', // I believe clientId is ignored at smit.
        scope: `openid fhirUser launch/patient ${resourceScope} offline_access`,
        iss: '(populated later)',
        completeInTarget: true,
        redirect_uri: 'index.html'
    };

document.addEventListener('DOMContentLoaded', () => {
    $('#start-app-button').addEventListener('click', startApp);

    readCookiesAndApply();
    
    // if 'sof_host' param is present, populate the field with it.
    const fhirUrlsHardCoded = {
        smit: 'https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir',
        epic: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4' // per https://open.epic.com/MyApps/Endpoints
        //const fhirUrl = 'https://vendorservices.epic.com/interconnect-amcurprd-oauth/oauth2/authorize';
        //const fhirUrl = 'https://appmarket.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4'; // per https://vendorservices.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4/metadata and earlier testing.
    };
    const urlParams = new URLSearchParams(window.location.search);
    let sofHostHardcodedShortName = urlParams.get('sof_host');
    if (sofHostHardcodedShortName && (sofHostHardcodedShortName in fhirUrlsHardCoded)) {
        setCookie('fhirUrl', fhirUrlsHardCoded[sofHostHardcodedShortName], 1);
        setCookie('environment', 'non-production', 1);
        readCookiesAndApply();
    }
});


const startApp = () => {
    // At this point, the field has the user's desired host URL.
    const fhirBaseUrlInput = $('#fhir-base-url');
    const inputFhirUrl = fhirBaseUrlInput.value.trim();

    if (!isValidUrl(inputFhirUrl)) {
        alert('The URL is not valid. Please enter a valid URL.');
        return;
    }
    
    setCookie('fhirUrl', inputFhirUrl, 1);
    config.iss = inputFhirUrl;

    const environmentRadios = document.getElementsByName('environment');
    let selectedEnvironment;
    for (const radio of environmentRadios) {
        if (radio.checked) {
                selectedEnvironment = radio.value;
                break;
        }
    }
    setCookie('environment', selectedEnvironment, 1);
    config.clientId = selectedEnvironment === 'production' ? 'd1bc396c-1b91-4135-bfd7-e028f3eeb43a' : '1fb63933-3891-4ac2-a080-e7de0acb6c7f';

    FHIR.oauth2.authorize(config);
}; // const startApp


if (sessionStorage.getItem('SMART_KEY')) { // is there an event like FHIR.oauth2.ready() which would include this criteria?
    FHIR.oauth2.ready().then(client => {
        const requestResources = (resourceType) => {
            let endpoint = (resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`) + client.getPatientId();
            return new Promise((resolve) => {
                client.request(endpoint, { flat: true }).then(result => {
                    let resourcesToPass = []
                    if (Array.isArray (result)) {
                        result.forEach(resource => {
                            if (resource === undefined || resource.resourceType != resourceType) return;
                            resourcesToPass.push(resource);
                        });
                    } else {
                        resourcesToPass.push(result);
                    }
                    resolve(resourcesToPass);
                });
            });
        };
        // Establish resource display methods
        const sectionDisplays = Object.fromEntries(
            Object.entries(patientResourceConfig).map(([resourceType, resourceConfig]) => {
                let title = resourceConfig.title ?? resourceNameToTitle(resourceType);
                let itemDisplayFn = resourceConfig.itemDisplayFn ?? defaultItemDisplayFn;
                let sectionDisplayFn = (resourceList) => (resourceConfig.sectionDisplayFn ?? defaultSectionDisplayFn)(resourceList, title, itemDisplayFn);
                return [resourceType, sectionDisplayFn];
            })
        );
        
        // Request resources, then display content according to configuration
        Object.entries(sectionDisplays).map(([resourceType, sectionDisplayFn]) => {
            requestResources(resourceType).then(
                result => sectionDisplayFn(result), // display the resource content
                error => alert(error) // doesn't run
            );
        });
    }).catch(console.error);
} //if (sessionStorage.getItem('SMART_KEY'))
    
// Read 'fhirUrl' cookie and populate the field with it.
function readCookiesAndApply() {

    let fhirUrlCookie = getCookie('fhirUrl');
    if (fhirUrlCookie != undefined){
        const fhirBaseUrlInput = $('#fhir-base-url');
        fhirBaseUrlInput.value = fhirUrlCookie;
    }

    const environmentCookie = getCookie('environment');
    if (environmentCookie) {
        const nonProductionRadio = $('#non-production');
        const productionRadio = $('#production');
        if (environmentCookie === 'production') {
            nonProductionRadio.checked = false;
            productionRadio.checked = true;
        } else {
            nonProductionRadio.checked = true;
            productionRadio.checked = false;
        }
    }
}

// Utility function to validate a URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Utility function to set a cookie
function setCookie(name, value, hours) {
  const date = new Date();
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
  const expires = '; expires=' + date.toUTCString();
  document.cookie = name + '=' + value + expires + '; path=/';
}

// Utility function to get a cookie
function getCookie(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }

  return null;
}

function simpleItem(resource){
    return `${resource.resourceType}: ${resource.fullUrl}`;
};

function immunizationItem(immunization){
    const displayText = immunization.vaccineCode.coding[0].display === undefined ? immunization.vaccineCode.text : immunization.vaccineCode.coding[0].display;
    return `${displayText} - ${immunization.occurrenceDateTime}`;
}

function resourceNameToTitle(str){
    if (str == null) return "";
    // "PractitionerRole" ->"Practitioner Roles"
    return str.match(/[A-Z][a-z]+/g).join(" ") + "s";
}

function sectionTitle(title) {
    return `<h2>${title}</h2>`;
}

function patientSection(resourceList, title, resourceContentFn) {
    let patient = resourceList[0];
    const PatientContent = $(`#${patient.resourceType}Content`);
    const name = patient.name[0];
    const formattedName = `${name.given.join(' ')} ${name.family}`;
    PatientContent.append(sectionTitle(`Patient Name: ${formattedName}`));
}

function listSection(resourceList, title, resourceContentFn){
    if (resourceList.length == 0) return;
    let resourceType = resourceList[0].resourceType;
    
    const section = $(`#${resourceType}Content`);
    section.append(sectionTitle(title ?? resourceNameToTitle(resourceType)));
    const list = document.createElement('ul');

    for (let i = 0; i < resourceList.length; i++) {
        const resource = resourceList[i];
        const listItem = document.createElement('li');
        listItem.textContent = resourceContentFn(resource);
        list.append(listItem);
    }
    section.append(list);
};
