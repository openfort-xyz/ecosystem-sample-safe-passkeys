import rapidsafe from 'rapidsafe';

export default defineContentScript({
  matches: ['https://*/*', 'http://localhost/*'],
  runAt: 'document_end',
  world: 'MAIN',
  main() {
    const s = new rapidsafe()
    const provider = s.getEthereumProvider()
      ; (window as any).ethereum = provider
  },
})
