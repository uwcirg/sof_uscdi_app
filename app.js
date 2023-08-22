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
    // 'Medication': {}, // can't search by patient; "Only an _ID search is allowed."
    'Condition': {},
    'Observation': {}, // "Must have either code or category."
    // 'Organization': {}, // can't search by patient; "Only an _ID search is allowed."
    'Immunization': {
        title: 'Immunization History',
        itemDisplayFn: immunizationItem,
    },
    // 'Device': {},
    // 'DeviceUseStatement': {}, // Not in EPIC USCDI R4
    'DiagnosticReport': {}, // TODO change to subject
    // 'ImagingStudy': {}, // Not in EPIC USCDI R4
    // 'Media': {}, // Not in EPIC USCDI R4
    // 'Practitioner': {}, // can't search by patient; "Either name, family, or identifier is a required parameter."
    // 'PractitionerRole': {},  // can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
    'Procedure': {}, // TODO change to subject
    // 'Specimen': {}, // Not in EPIC USCDI R4
}

const patientResourceScope = Object.keys(patientResourceConfig).map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const nonProductionClientID = '1fb63933-3891-4ac2-a080-e7de0acb6c7f';
const productionClientID = 'd1bc396c-1b91-4135-bfd7-e028f3eeb43a';
const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: productionClientID, // I believe clientId is ignored at smit.
        scope: `openid fhirUser launch/patient ${resourceScope} offline_access`,
        iss: '(populated later)',
        completeInTarget: true,
        redirect_uri: 'index.html'
    };

$(document).ready(() => {
    $('#start-app-button').on('click', startApp);
    $('#fhir-base-url').on('click', selectOther);
    $('.accordion-header').click(function() {
        $(this).toggleClass('active');
        $(this).next('.accordion-content').slideToggle();
      });
    $('#show-more').click(function() {
        $('#show-more').slideToggle();
        $('#more').slideToggle();
    });
    $('#show-less').click(function() {
        $('#more').slideToggle();
        $('#show-more').slideToggle();
    });
});


function startApp() {
    // At this point, the field has the user's desired host URL.
    const endpointSelection = $('input[type=radio]:checked');
    config.clientId = endpointSelection.hasClass('production') ? productionClientID : nonProductionClientID;
    let valueInput = endpointSelection.attr('id') === "other" ? $('#fhir-base-url') : endpointSelection;
    let inputFhirUrl = valueInput.val().trim();
    if (inputFhirUrl.endsWith('/')) {
        inputFhirUrl = inputFhirUrl.split(0, -1);
    }

    if (!isValidUrl(inputFhirUrl)) {
        alert('The URL is not valid. Please enter a valid URL.');
        return;
    }
    config.iss = inputFhirUrl;

    FHIR.oauth2.authorize(config);
}; // const startApp

function selectOther() {
    $('input[type=radio]:checked').prop('checked', false);
    $('#other').prop('checked', true);
}

if (sessionStorage.getItem('SMART_KEY')) { // is there an event like FHIR.oauth2.ready() which would include this criteria?
    FHIR.oauth2.ready().then(client => {
        if (client.getPatientId()) {
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
        }
    }).catch(console.error);
} //if (sessionStorage.getItem('SMART_KEY'))
    
// Read 'fhirUrl' cookie and populate the field with it.
function readCookiesAndApply() {

    let fhirUrlCookie = getCookie('fhirUrl');
    if (fhirUrlCookie != undefined){
        const fhirBaseUrlInput = $('#fhir-base-url');
        fhirBaseUrlInput.val(fhirUrlCookie);
    }

    const environmentCookie = getCookie('environment');
    if (environmentCookie) {
        const nonProductionRadio = $('#non-production');
        const productionRadio = $('#production');
        if (environmentCookie === 'production') {
            nonProductionRadio.prop('checked', false);
            productionRadio.prop('checked', true);
        } else {
            nonProductionRadio.prop('checked', true);
            productionRadio.prop('checked', false);
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
    return `${resource.resourceType}: ${JSON.stringify(resource, space=4)}`;
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
