const config = {
        clientId: 'c916889f-4e33-4dfa-980d-966ba49315f3',
        scope: 'openid fhirUser launch/patient patient/Patient.read patient/Immunization.read offline_access',
        iss: '(populated later)',
        completeInTarget: true,
        redirect_uri: 'index.html'
    };
    
const startApp = () => {

    FHIR.oauth2.authorize(config);

}; // const startApp

if (sessionStorage.getItem('SMART_KEY')) {
FHIR.oauth2.ready().then(client => {
    // For SMIT, "Abdul Koepp" has immunizations...
    const patientInfo = document.getElementById('patient-info');
    const immunizationHistory = document.getElementById('immunization-history');

    client.request('Patient/' + client.getPatientId()).then(patient => {
        const name = patient.name[0];
        const formattedName = `${name.given.join(' ')} ${name.family}`;
        patientInfo.innerHTML = `<h2>Patient Name: ${formattedName}</h2>`;
    });

    client.request(`Immunization?patient=${client.getPatientId()}`, { flat: true }).then(immunizations => {
        immunizationHistory.innerHTML = '<h2>Immunization History:</h2>';
        const list = document.createElement('ul');

        for (let i = 0; i < immunizations.length; i++) {
            const immunization = immunizations[i];
            if (immunization === undefined || immunization.resourceType != 'Immunization') continue;
            const listItem = document.createElement('li');
            //const displayText = immunization.vaccineCode.coding[0].display ? immunization.vaccineCode.coding[0].display : immunization.vaccineCode.text;
            const displayText = immunization.vaccineCode.coding[0].display === undefined ? immunization.vaccineCode.text : immunization.vaccineCode.coding[0].display;
            listItem.textContent = `${displayText} - ${immunization.occurrenceDateTime}`;
            list.appendChild(listItem);
        }

        immunizationHistory.appendChild(list);
    });
}).catch(console.error);
    
}
    
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-app-button').addEventListener('click', startApp);
    
    const fhirUrls = {
        smit: 'https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir',
        epic: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4' // per https://open.epic.com/MyApps/Endpoints
    };
    const urlParams = new URLSearchParams(window.location.search);
    let sofHost = urlParams.get('sof_host');
    if (sofHost) {
        // Save 'sof_host' to a cookie if it exists
        setCookie('sofHost', sofHost, 1);
    } else {
        // If 'sof_host' URL parameter doesn't exist, read it from the cookie
        sofHost = getCookie('sofHost') || 'smit';
    }

    // Select the FHIR URL from the lookup table based on the 'sof_host' parameter
    const fhirUrl = fhirUrls[sofHost];
    //const fhirUrl = 'https://vendorservices.epic.com/interconnect-amcurprd-oauth/oauth2/authorize';
    //const fhirUrl = 'https://appmarket.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4'; // per https://vendorservices.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4/metadata and earlier testing.
    config.iss = fhirUrl;
    
    const immunizationHistory = document.getElementById('sof_host_info');
    const fhirUrlToDisplay = document.createElement('p');
    fhirUrlToDisplay.textContent = "FHIR server: " + fhirUrl;
    immunizationHistory.appendChild(fhirUrlToDisplay);

});

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
