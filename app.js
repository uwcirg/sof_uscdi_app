document.addEventListener('DOMContentLoaded', () => {
    const clientId = 'your-client-id';
    const fhirUrl = 'https://fhir.epic.com/your-fhir-server-url';

    const config = {
        clientId,
        scope: 'openid fhirUser launch/patient patient/Patient.read patient/Immunization.read',
        iss: fhirUrl,
        completeInTarget: true,
    };

    FHIR.oauth2.authorize(config);
});

FHIR.oauth2.ready().then(client => {
    const patientInfo = document.getElementById('patient-info');
    const immunizationHistory = document.getElementById('immunization-history');

    client.patient.read().then(patient => {
        const name = patient.name[0];
        const formattedName = `${name.given.join(' ')} ${name.family}`;
        patientInfo.innerHTML = `<h2>Patient Name: ${formattedName}</h2>`;
    });

    const immunizationQuery = new URLSearchParams();
    immunizationQuery.set('patient', client.patient.id);

    client.request(`Immunization?${immunizationQuery}`, {flat: true}).then(immunizations => {
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
