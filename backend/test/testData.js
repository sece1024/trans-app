const data = [
  {
    ip: ['127.0.0.1', '127.0.0.2'],
    data: {
      textData: [
        {
          type: 'text',
          content: 'hello world',
          createdAt: '2025-03-29',
          deviceInfo: 'none',
        },
      ],
      fileData: [
        {
          type: 'image',
          name: 'qwe',
          sizeInMB: '1.2',
        },
        {
          type: 'file',
          name: 'ewq',
          sizeInMB: '5.5',
        },
      ],
    },
  },
];

const remoteData = {
  type: 'sync',
  ip: '127.0.0.1,127.0.0.2',
  data: {
    textData: [
      {
        type: 'text',
        content: 'hello world',
        createdAt: '2025-03-29',
        deviceInfo: 'none',
      },
    ],
    fileData: [
      {
        type: 'image',
        name: 'qwe',
        sizeInMB: '1.2',
      },
      {
        type: 'file',
        name: 'ewq',
        sizeInMB: '5.5',
      },
    ],
  },
};

console.log(JSON.stringify(remoteData, null, 2));
