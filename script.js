let currentPath = [];
let rootContent = [];
let currentFileUrl = '';

document.addEventListener('DOMContentLoaded', function() {
    fetch('https://api.github.com/repos/OzcanCevik/robot-situation-awareness/contents/')
        .then(response => response.json())
        .then(data => {
            rootContent = data;
        });
});

function loadRoot() {
    currentPath = [];
    displayFiles(rootContent);
}

function goBack() {
    currentPath.pop();
    if (currentPath.length === 0) {
        displayFiles(rootContent);
        document.getElementById('backButton').classList.add('hidden');
    } else {
        fetchFiles(currentPath.join('/')).then(data => displayFiles(data));
    }
}

function fetchFiles(path) {
    return fetch(`https://api.github.com/repos/OzcanCevik/robot-situation-awareness/contents/${path}`)
        .then(response => response.json());
}

function displayFiles(files) {
    const fileButtons = document.getElementById('fileButtons');
    fileButtons.innerHTML = '';
    document.getElementById('fileContent').classList.add('hidden');

    files.forEach(file => {
        const button = document.createElement('button');
        button.textContent = file.name;
        button.onclick = () => handleFileClick(file);
        fileButtons.appendChild(button);
    });

    document.getElementById('navigation').classList.remove('hidden');
}

function handleFileClick(file) {
    if (file.type === 'dir') {
        currentPath.push(file.name);
        fetchFiles(currentPath.join('/')).then(data => {
            displayFiles(data);
            document.getElementById('backButton').classList.remove('hidden');
        });
    } else {
        currentFileUrl = file.html_url;
        fetch(file.download_url)
            .then(response => response.text())
            .then(content => {
                document.getElementById('codeBlock').textContent = content;
                Prism.highlightAll();
                document.getElementById('fileContent').classList.remove('hidden');
                document.getElementById('output').textContent = ''; // Clear previous output
            });
    }
}

function openGitHub() {
    window.open(currentFileUrl, '_blank');
}

function runPython() {
    const code = document.getElementById('codeBlock').textContent;
    const outputElement = document.getElementById('output');
    outputElement.textContent = ''; // Clear previous output

    Sk.configure({ 
        output: outf,
        read: builtinRead,
        execLimit: 10000, // Optional: Limit the execution time to prevent infinite loops
    });

    // Fetch module contents
    const moduleUrls = {
        "sensor_interface": "https://raw.githubusercontent.com/OzcanCevik/robot-situation-awareness/main/src/sensor_interface.py",
        "situation_recognition": "https://raw.githubusercontent.com/OzcanCevik/robot-situation-awareness/main/src/situation_recognition.py",
        "decision_making": "https://raw.githubusercontent.com/OzcanCevik/robot-situation-awareness/main/src/decision_making.py",
        "reactions": "https://raw.githubusercontent.com/OzcanCevik/robot-situation-awareness/main/src/reactions.py",
        "memory": "https://raw.githubusercontent.com/OzcanCevik/robot-situation-awareness/main/src/memory.py"
    };

    let modulePromises = [];
    for (const [moduleName, url] of Object.entries(moduleUrls)) {
        modulePromises.push(
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${moduleName} from ${url}`);
                    }
                    return response.text();
                })
        );
    }

    Promise.all(modulePromises)
        .then(modules => {
            let index = 0;
            for (const moduleName of Object.keys(moduleUrls)) {
                try {
                    Sk.importMainWithBody(moduleName, false, modules[index]);
                } catch (err) {
                    console.error(`Failed to load module: ${moduleName}`, err);
                }
                index++;
            }

            // Run main script
            Sk.misceval.asyncToPromise(function() {
                return Sk.importMainWithBody("<stdin>", false, code, true);
            }).then(function(mod) {
                console.log('Script executed successfully');
            }).catch(function(err) {
                console.error('Error executing script:', err);
                outf(err.toString());
            });
        })
        .catch(function(err) {
            console.error('Error loading modules:', err);
        });

    function outf(text) {
        outputElement.textContent += text + '\n';
    }

    function builtinRead(x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
        return Sk.builtinFiles["files"][x];
    }
}
