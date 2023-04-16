const startApp = () => {
    const clientId = 'client_id_mcjustin';
    const fhirUrl = 'https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir';

    const config = {
        clientId,
        scope: 'openid fhirUser launch/patient patient/Patient.read patient/Immunization.read',
        iss: fhirUrl,
        completeInTarget: true,
    };

    FHIR.oauth2.authorize(config);
};

document.getElementById('start-app-button').addEventListener('click', startApp);

FHIR.oauth2.init({
    client_id: 'client_id_mcjustin',
    scope: 'openid fhirUser launch/patient patient/Patient.read patient/Immunization.read',
    redirect_uri: 'https://your-redirect-uri'
}).then(client => {
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

        immunizations.forEach(immunization => {
            const listItem = document.createElement('li');
            listItem.textContent = `${immunization.vaccineCode.coding[0].display} - ${immunization.occurrenceDateTime}`;
            list.appendChild(listItem);
        });

        immunizationHistory.appendChild(list);
    });
}).catch(console.error);
