const resourceScope = [
    'patient/Patient.read',
    'patient/AllergyIntolerance.read',
    // 'patient/MedicationStatement.read',
    'patient/MedicationRequest.read',
    'patient/Medication.read',
    'patient/Condition.read',
    'patient/Observation.read',
    'patient/Organization.read',
    'patient/Immunization.read',
    'patient/Device.read',
    // 'patient/DeviceUseStatement.read',
    'patient/DiagnosticReport.read',
    'patient/ImagingStudy.read',
    // 'patient/Media.read',
    'patient/Practitioner.read',
    'patient/PractitionerRole.read',
    'patient/Procedure.read',
    // 'patient/Specimen.read',
].join(" ");

const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: 'c916889f-4e33-4dfa-980d-966ba49315f3', // I believe clientId is ignored at smit.
        scope: `openid fhirUser launch/patient ${resourceScope} offline_access`,
        iss: '(populated later)',
        completeInTarget: true,
        redirect_uri: 'index.html'
    };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-app-button').addEventListener('click', startApp);

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
    const fhirBaseUrlInput = document.getElementById('fhir-base-url');
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
        // For SMIT, "Abdul Koepp" has immunizations...
        const patientInfo = document.getElementById('patient-info');
        const immunizationHistory = document.getElementById('immunization-history');
        const AllergyIntoleranceContent = document.getElementById('AllergyIntoleranceContent');
        // const MedicationStatementContent = document.getElementById('MedicationStatementContent');
        const MedicationRequestContent = document.getElementById('MedicationRequestContent');
        const MedicationContent = document.getElementById('MedicationContent');
        const ConditionContent = document.getElementById('ConditionContent');
        const ObservationContent = document.getElementById('ObservationContent');
        const OrganizationContent = document.getElementById('OrganizationContent');
        const DeviceContent = document.getElementById('DeviceContent');
        // const DeviceUseStatementContent = document.getElementById('DeviceUseStatementContent');
        const DiagnosticReportContent = document.getElementById('DiagnosticReportContent');
        const ImagingStudyContent = document.getElementById('ImagingStudyContent');
        // const MediaContent = document.getElementById('MediaContent');
        const PractitionerContent = document.getElementById('PractitionerContent');
        const PractitionerRoleContent = document.getElementById('PractitionerRoleContent');
        const ProcedureContent = document.getElementById('ProcedureContent');
        // const SpecimenContent = document.getElementById('SpecimenContent');

        const requestAndDisplay = (resourceType, displayCallback) => {
            endpoint = (resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`) + client.getPatientId()
            client.request(endpoint).then(resources => {
                resourcesToPass = []
                resources.forEach(resource => {
                    if (resource === undefined || resource.resourceType != resourceType) return;
                    resourcesToPass.push(resource);
                });
                displayCallback(resourcesToPass);
            });
        }

        requestAndDisplay('Patient', patient => {
            const name = patient.name[0];
            const formattedName = `${name.given.join(' ')} ${name.family}`;
            patientInfo.append(`<h2>Patient Name: ${formattedName}</h2>`);
        });

        requestAndDisplay('Immunization', immunizations => {
            immunizationHistory.append('<h2>Immunization History:</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < immunizations.length; i++) {
                const immunization = immunizations[i];
                const listItem = document.createElement('li');
                //const displayText = immunization.vaccineCode.coding[0].display ? immunization.vaccineCode.coding[0].display : immunization.vaccineCode.text;
                const displayText = immunization.vaccineCode.coding[0].display === undefined ? immunization.vaccineCode.text : immunization.vaccineCode.coding[0].display;
                listItem.textContent = `${displayText} - ${immunization.occurrenceDateTime}`;
                list.append(listItem);
            }

            immunizationHistory.append(list);
        });

        requestAndDisplay('AllergyIntolerance', allergyintolerances => {
            AllergyIntoleranceContent.append('<h2>Allergies and Intolerances</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < allergyintolerances.length; i++) {
                const allergyintolerance = allergyintolerances[i];
                const listItem = document.createElement('li');
                listItem.textContent = "AllergyIntolerance: " + allergyintolerance.fullUrl;
                list.append(listItem);
            }

            AllergyIntoleranceContent.append(list)
        });

        // requestAndDisplay('MedicationStatement', medicationstatements => {
        //     MedicationStatementContent.append('<h2>MedicationStatements</h2>');
        //     const list = document.createElement('ul');

        //     for (let i = 0; i < medicationstatements.length; i++) {
        //         const medicationstatement = medicationstatements[i];
        //         const listItem = document.createElement('li');
        //         listItem.textContent = "MedicationStatement: " + medicationstatement.fullUrl;
        //         list.append(listItem);
        //     }

        //     MedicationStatementContent.append(list)
        // });

        requestAndDisplay('MedicationRequest', medicationrequests => {
            MedicationRequestContent.append('<h2>MedicationRequests</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < medicationrequests.length; i++) {
                const medicationrequest = medicationrequests[i];
                const listItem = document.createElement('li');
                listItem.textContent = "MedicationRequest: " + medicationrequest.fullUrl;
                list.append(listItem);
            }

            MedicationRequestContent.append(list)
        });

        requestAndDisplay('Medication', medications => {
            MedicationContent.append('<h2>Medications</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < medications.length; i++) {
                const medication = medications[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Medication: " + medication.fullUrl;
                list.append(listItem);
            }

            MedicationContent.append(list)
        });

        requestAndDisplay('Condition', conditions => {
            ConditionContent.append('<h2>Conditions</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < conditions.length; i++) {
                const condition = conditions[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Condition: " + condition.fullUrl;
                list.append(listItem);
            }

            ConditionContent.append(list)
        });

        requestAndDisplay('Observation', observations => {
            ObservationContent.append('<h2>Observations</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < observations.length; i++) {
                const observation = observations[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Observation: " + observation.fullUrl;
                list.append(listItem);
            }

            ObservationContent.append(list)
        });

        requestAndDisplay('Organization', organizations => {
            OrganizationContent.append('<h2>Organizations</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < organizations.length; i++) {
                const organization = organizations[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Organization: " + organization.fullUrl;
                list.append(listItem);
            }

            OrganizationContent.append(list)
        });

        requestAndDisplay('Device', devices => {
            DeviceContent.append('<h2>Devices</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < devices.length; i++) {
                const device = devices[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Device: " + device.fullUrl;
                list.append(listItem);
            }

            DeviceContent.append(list)
        });

        // requestAndDisplay('DeviceUseStatement', deviceusestatements => {
        //     DeviceUseStatementContent.append('<h2>Device Uses</h2>');
        //     const list = document.createElement('ul');

        //     for (let i = 0; i < deviceusestatements.length; i++) {
        //         const deviceusestatement = deviceusestatements[i];
        //         const listItem = document.createElement('li');
        //         listItem.textContent = "DeviceUseStatement: " + deviceusestatement.fullUrl;
        //         list.append(listItem);
        //     }

        //     DeviceUseStatementContent.append(list)
        // });

        requestAndDisplay('DiagnosticReport', diagnosticreports => {
            DiagnosticReportContent.append('<h2>Diagnostic Reports</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < diagnosticreports.length; i++) {
                const diagnosticreport = diagnosticreports[i];
                const listItem = document.createElement('li');
                listItem.textContent = "DiagnosticReport: " + diagnosticreport.fullUrl;
                list.append(listItem);
            }

            DiagnosticReportContent.append(list)
        });

        requestAndDisplay('ImagingStudy', imagingstudies => {
            ImagingStudyContent.append('<h2>Imaging Studies</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < imagingStudies.length; i++) {
                const imagingstudy = imagingStudies[i];
                const listItem = document.createElement('li');
                listItem.textContent = "ImagingStudy: " + imagingstudie.fullUrl;
                list.append(listItem);
            }

            ImagingStudyContent.append(list)
        });

        // requestAndDisplay('Media', media => {
        //     MediaContent.append('<h2>Media</h2>');
        //     const list = document.createElement('ul');

        //     for (let i = 0; i < media.length; i++) {
        //         const media = media[i];
        //         const listItem = document.createElement('li');
        //         listItem.textContent = "Media: " + medi.fullUrl;
        //         list.append(listItem);
        //     }

        //     MediaContent.append(list)
        // });

        requestAndDisplay('Practitioner', practitioners => {
            PractitionerContent.append('<h2>Practitioners</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < practitioners.length; i++) {
                const practitioner = practitioners[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Practitioner: " + practitioner.fullUrl;
                list.append(listItem);
            }

            PractitionerContent.append(list)
        });

        requestAndDisplay('PractitionerRole', practitionerroles => {
            PractitionerRoleContent.append('<h2>Practitioner Roles</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < practitionerroles.length; i++) {
                const practitionerrole = practitionerroles[i];
                const listItem = document.createElement('li');
                listItem.textContent = "PractitionerRole: " + practitionerrole.fullUrl;
                list.append(listItem);
            }

            PractitionerRoleContent.append(list)
        });

        requestAndDisplay('Procedure', procedures => {
            ProcedureContent.append('<h2>Procedures</h2>');
            const list = document.createElement('ul');

            for (let i = 0; i < procedures.length; i++) {
                const procedure = procedures[i];
                const listItem = document.createElement('li');
                listItem.textContent = "Procedure: " + procedure.fullUrl;
                list.append(listItem);
            }

            ProcedureContent.append(list)
        });

        // requestAndDisplay('Specimen', specimens => {
        //     SpecimenContent.append('<h2>Specimens</h2>');
        //     const list = document.createElement('ul');

        //     for (let i = 0; i < specimens.length; i++) {
        //         const specimen = specimens[i];
        //         const listItem = document.createElement('li');
        //         listItem.textContent = "Specimen: " + specimen.fullUrl;
        //         list.append(listItem);
        //     }

        //     SpecimenContent.append(list)
        // });

    }).catch(console.error);
} //if (sessionStorage.getItem('SMART_KEY'))
    
// Read 'fhirUrl' cookie and populate the field with it.
function readCookiesAndApply() {

    let fhirUrlCookie = getCookie('fhirUrl');
    if (fhirUrlCookie != undefined){
        const fhirBaseUrlInput = document.getElementById('fhir-base-url');
        fhirBaseUrlInput.value = fhirUrlCookie;
    }

    const environmentCookie = getCookie('environment');
    if (environmentCookie) {
        const nonProductionRadio = document.getElementById('non-production');
        const productionRadio = document.getElementById('production');
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
